import { EventEmitter } from 'node:events'
import { HerdrError, HerdrWatch, herdrCall, herdrSocketPath } from './socket.js'
import { diffShipLog, type ShipLogEntry } from './log.js'
import {
  nextAgentName,
  projectSnapshot,
  shellPanes,
  shellReady,
  shellState,
  splitTarget,
  type HerdrAgentInfo,
  type HerdrSnapshot,
  type ProjectedAgent,
  type ProjectedWorkspace,
} from './project.js'
import { lastTaskResult } from './result.js'
import { canAnswer, canTakeNote } from './speech.js'

const LIFECYCLE = [
  'workspace.created',
  'workspace.updated',
  'workspace.metadata_updated',
  'workspace.renamed',
  'workspace.closed',
  'workspace.focused',
  'tab.created',
  'tab.closed',
  'tab.focused',
  'tab.renamed',
  'tab.moved',
  'pane.created',
  'pane.closed',
  'pane.focused',
  'pane.exited',
  'pane.agent_detected',
]

interface SnapshotResult {
  type: string
  snapshot: HerdrSnapshot
}

interface WorkspaceCreated {
  type: string
  workspace: { workspace_id: string }
}

interface AgentStarted {
  type: string
  agent: HerdrAgentInfo
}

interface SplitResult {
  type: string
  second?: { type?: string; pane_id?: string | null }
}

interface ManifestResult {
  type: string
  manifests: Array<{ agent: string }>
}

const START_RETRY_CODES = new Set([
  'agent_not_ready',
  'pane_not_ready',
  'not_ready',
])

const SHELL_WAIT_MS = 12_000
const START_WAIT_MS = 20_000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class HerdrSession extends EventEmitter {
  private snapshot: HerdrSnapshot | null = null
  private watch = new HerdrWatch(herdrSocketPath())
  private watchKey = ''
  private holdKey = ''
  private refreshTimer: ReturnType<typeof setTimeout> | undefined
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private pulse: ReturnType<typeof setInterval> | undefined
  private refreshing: Promise<void> | null = null
  private fingerprint = ''
  private previousIslands: ProjectedWorkspace[] | null = null
  private shipLog: ShipLogEntry[] = []
  offlineError: string | null = null

  async start() {
    try {
      await this.refresh()
    } catch {
      this.armRetry()
    }
    this.pulse = setInterval(() => this.schedule(), 2_000)
  }

  stop() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    if (this.retryTimer) clearTimeout(this.retryTimer)
    if (this.pulse) clearInterval(this.pulse)
    this.watch.stop()
  }

  connected() {
    return this.snapshot !== null
  }

  list() {
    if (!this.snapshot) return []
    return projectSnapshot(this.snapshot)
  }

  get(workspaceId: string) {
    return this.list().find((workspace) => workspace.id === workspaceId) ?? null
  }

  log() {
    return this.shipLog
  }

  private schedule() {
    if (this.refreshTimer) return
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined
      void this.refresh().catch(() => this.armRetry())
    }, 40)
  }

  private armRetry() {
    if (this.retryTimer) return
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined
      this.holdKey = ''
      this.schedule()
    }, 1_500)
  }

  private async refresh() {
    if (this.refreshing) return this.refreshing
    this.refreshing = this.load().finally(() => {
      this.refreshing = null
    })
    return this.refreshing
  }

  private async load() {
    try {
      const result = await herdrCall<SnapshotResult>('session.snapshot', {})
      this.snapshot = result.snapshot
      this.offlineError = null
      const islands = projectSnapshot(result.snapshot)
      const entries = diffShipLog(this.previousIslands, islands, new Date().toISOString())
      this.previousIslands = islands
      if (entries.length > 0) {
        this.shipLog = entries.concat(this.shipLog).slice(0, 48)
      }
      const projected = JSON.stringify(islands)
      if (projected !== this.fingerprint) {
        this.fingerprint = projected
        this.emit('sync')
      }
      this.syncWatch(result.snapshot.panes.map((pane) => pane.pane_id))
    } catch (err) {
      this.snapshot = null
      this.watch.stop()
      this.watchKey = ''
      const message = err instanceof Error ? err.message : 'Herdr is not running'
      if (message !== this.offlineError) {
        this.offlineError = message
        this.fingerprint = ''
        this.emit('sync')
      }
      throw err
    }
  }

  private syncWatch(paneIds: string[]) {
    const subscriptions: Array<Record<string, unknown>> = [
      ...LIFECYCLE.map((type) => ({ type })),
      ...paneIds.map((pane_id) => ({ type: 'pane.agent_status_changed', pane_id })),
    ]
    const key = JSON.stringify(subscriptions)
    if (key === this.holdKey) return
    if (key === this.watchKey && (this.watch.open || this.watch.pending)) return
    this.watchKey = key
    this.watch.listen(subscriptions, {
      onEvent: () => this.schedule(),
      onFail: () => {
        console.warn('herdr watch dropped; retrying')
        this.watchKey = ''
        this.holdKey = key
        this.armRetry()
      },
    })
  }

  private requireSnapshot() {
    if (!this.snapshot) {
      throw new HerdrError(
        this.offlineError || 'Herdr is not running. Start it with herdr, then reload.',
        'offline',
      )
    }
    return this.snapshot
  }

  private async reload() {
    await this.refresh()
    return this.requireSnapshot()
  }

  async createWorkspace(label: string, cwd: string) {
    const created = await herdrCall<WorkspaceCreated>('workspace.create', {
      label,
      cwd,
      focus: false,
    })
    await this.reload()
    const workspace = this.get(created.workspace.workspace_id)
    if (!workspace) throw new HerdrError('Herdr created a workspace Atoll cannot see', 'missing')
    return workspace
  }

  async closeWorkspace(workspaceId: string) {
    this.requireSnapshot()
    if (!this.get(workspaceId)) return false
    await herdrCall('workspace.close', { workspace_id: workspaceId })
    await this.reload().catch(() => undefined)
    return true
  }

  async promptAgent(workspaceId: string, paneId: string, text: string) {
    const agent = this.agent(workspaceId, paneId)
    if (!agent) return false
    if (!canTakeNote(agent.status)) {
      throw new HerdrError(
        'Hand a note when they are sleeping or holding a check.',
        'not_ready',
      )
    }
    await herdrCall('agent.prompt', { target: paneId, text })
    this.schedule()
    return true
  }

  async answerAgent(workspaceId: string, paneId: string, text: string) {
    const agent = this.agent(workspaceId, paneId)
    if (!agent) return false
    if (!canAnswer(agent.status)) {
      throw new HerdrError('Answer when they are standing in the surf.', 'not_ready')
    }
    await herdrCall('pane.send_text', { pane_id: paneId, text })
    try {
      await herdrCall('pane.send_keys', { pane_id: paneId, keys: ['enter'] })
    } catch (err) {
      const code = err instanceof HerdrError ? err.code : 'enter'
      throw new HerdrError(
        'The reply is typed, and Enter did not land. Try again from the shore.',
        code,
      )
    }
    this.schedule()
    return true
  }

  async focusAgent(workspaceId: string, paneId: string) {
    const agent = this.agent(workspaceId, paneId)
    if (!agent) return false
    await herdrCall('agent.focus', { target: paneId })
    return true
  }

  async taskResult(workspaceId: string, paneId: string) {
    const agent = this.agent(workspaceId, paneId)
    if (!agent) return undefined
    const read = await herdrCall<{ read?: { text?: string | null } }>('agent.read', {
      target: paneId,
      source: 'recent_unwrapped',
      lines: 1000,
      strip_ansi: true,
    })
    return lastTaskResult(read.read?.text ?? '')
  }

  async dismissAgent(workspaceId: string, paneId: string) {
    const agent = this.agent(workspaceId, paneId)
    if (!agent) return false
    await herdrCall('pane.close', { pane_id: paneId })
    await this.reload().catch(() => undefined)
    return true
  }

  async spawnAgent(workspaceId: string, kind: string, task: string): Promise<ProjectedAgent> {
    const snapshot = this.requireSnapshot()
    const workspace = snapshot.workspaces.find((item) => item.workspace_id === workspaceId)
    if (!workspace) throw new HerdrError('Island not found', 'not_found')
    const projected = this.get(workspaceId)
    const paneId = await this.claimShell(snapshot, workspace.workspace_id, workspace.active_tab_id, projected?.path)
    const ready = await this.waitForShell(paneId)
    const used = (this.snapshot?.agents ?? [])
      .map((agent) => agent.name)
      .filter((name): name is string => Boolean(name))
    const name = nextAgentName(kind, used)
    const started = await this.startAgent(name, kind, paneId, ready)
    try {
      await this.handTask(started.agent.name || name, task)
    } finally {
      await this.reload().catch(() => undefined)
    }
    return (
      this.agent(workspaceId, started.agent.pane_id) ?? {
        id: started.agent.pane_id,
        workspaceId,
        name: started.agent.display_agent || started.agent.name || name,
        color: 200,
        status: 'working',
        kind,
        x: 12,
        createdAt: '1970-01-01T00:00:00.000Z',
      }
    )
  }

  private agent(workspaceId: string, paneId: string) {
    return this.get(workspaceId)?.agents.find((agent) => agent.id === paneId) ?? null
  }

  private async claimShell(
    snapshot: HerdrSnapshot,
    workspaceId: string,
    activeTabId: string,
    cwd: string | undefined,
  ) {
    for (const pane of shellPanes(snapshot, workspaceId, activeTabId)) {
      if ((await this.inspectShell(pane.pane_id)) !== 'busy') return pane.pane_id
    }
    const target = splitTarget(snapshot, workspaceId, activeTabId)
    if (!target) throw new HerdrError('This island has no pane to split', 'no_pane')
    const before = new Set(snapshot.panes.map((pane) => pane.pane_id))
    const split = await herdrCall<SplitResult>('pane.split', {
      direction: 'right',
      target_pane_id: target.pane_id,
      workspace_id: workspaceId,
      cwd: cwd || null,
      focus: false,
    })
    const created = split.second?.pane_id
    if (created && !before.has(created)) return created
    const fresh = await this.reload()
    const added = fresh.panes.find(
      (pane) => pane.workspace_id === workspaceId && !before.has(pane.pane_id),
    )
    if (!added) throw new HerdrError('Herdr split a pane Atoll cannot see', 'missing')
    return added.pane_id
  }

  private async inspectShell(paneId: string) {
    try {
      const result = await herdrCall<{
        process_info: {
          shell_pid?: number | null
          foreground_processes?: Array<{ pid: number; name: string }> | null
        }
      }>('pane.process_info', { pane_id: paneId })
      return shellState(result.process_info)
    } catch {
      return 'starting' as const
    }
  }

  private async waitForShell(paneId: string) {
    const deadline = Date.now() + SHELL_WAIT_MS
    while (Date.now() < deadline) {
      try {
        const result = await herdrCall<{
          process_info: {
            shell_pid?: number | null
            foreground_processes?: Array<{ pid: number; name: string }> | null
          }
        }>('pane.process_info', { pane_id: paneId })
        if (shellReady(result.process_info)) return true
      } catch {
        // The split pane can appear before Herdr can describe its process.
      }
      await sleep(300)
    }
    return false
  }

  private async handTask(target: string, task: string) {
    let last: HerdrError | null = null
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
      try {
        await herdrCall('agent.prompt', { target, text: task })
        return
      } catch (err) {
        if (!(err instanceof HerdrError)) throw err
        last = err
        const waiting =
          err.code === 'agent_not_ready' ||
          err.code === 'agent_prompt_stalled' ||
          err.code === 'agent_not_found' ||
          /not an active named agent/i.test(err.message)
        if (!waiting) throw err
        await sleep(400)
      }
    }
    throw last ?? new HerdrError('The agent started, and the task did not land.', 'agent_not_ready')
  }

  private async startAgent(name: string, kind: string, paneId: string, shellWasReady: boolean) {
    let last: HerdrError | null = null
    const deadline = Date.now() + START_WAIT_MS
    while (Date.now() < deadline) {
      try {
        return await herdrCall<AgentStarted>(
          'agent.start',
          { name, kind, pane_id: paneId, timeout_ms: 30_000 },
          45_000,
        )
      } catch (err) {
        if (!(err instanceof HerdrError)) throw err
        last = err
        const waiting = START_RETRY_CODES.has(err.code) || /available shell/i.test(err.message)
        if (!waiting) throw err
        await sleep(500)
      }
    }
    if (!shellWasReady) {
      throw new HerdrError(
        'Herdr opened a shell, and it has not reached a prompt yet. Leave that pane alone and try again in a moment.',
        'agent_not_ready',
      )
    }
    throw last ?? new HerdrError('Herdr did not start the agent', 'agent_not_ready')
  }

  async kinds() {
    const result = await herdrCall<ManifestResult>('server.agent_manifests', {})
    const kinds = [...new Set(result.manifests.map((item) => item.agent).filter(Boolean))]
    kinds.sort((a, b) => a.localeCompare(b))
    return kinds
  }
}

export const herdrSession = new HerdrSession()
