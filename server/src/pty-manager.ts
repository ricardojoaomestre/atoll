import { EventEmitter } from 'node:events'
import * as pty from 'node-pty-prebuilt-multiarch'
import type { IPty } from 'node-pty-prebuilt-multiarch'
import type { WebSocket } from 'ws'
import { getCli } from './cli/index.js'
import { consumeInput, taskText } from './task-summary.js'
import { requestTitle } from './task-title.js'
import { addAgent, getSettings, getWorkspace, listWorkspaces, removeAgent, updateAgent } from './store.js'
import type { AgentRecord, AgentStatus, CliId } from './types.js'

const WAIT_PROMPT_MS = 1_500
const TASK_DONE_MS = 6_000
const SLEEP_MS = 20_000
const TYPING_HOLD_MS = 800
const TASK_SCAN_MS = 400
const TASK_CHILD_CAP = 8
const REPLAY_MAX = 200_000
const REPLAY_COMPACT_AT = 240_000

interface Session {
  agentId: string
  workspaceId: string
  workspacePath: string
  cli: CliId
  pty: IPty
  sockets: Set<WebSocket>
  status: AgentStatus
  lastActivityAt: number
  lastInputAt: number
  idleTimer?: ReturnType<typeof setTimeout>
  taskTimer?: ReturnType<typeof setTimeout>
  replayChunks: string[]
  replayBytes: number
  draft: string
  summary?: string
  titleAbort?: AbortController
}

function appendReplay(session: Session, data: string) {
  session.replayChunks.push(data)
  session.replayBytes += data.length
  if (session.replayBytes > REPLAY_COMPACT_AT) {
    compactReplay(session)
  }
}

function compactReplay(session: Session) {
  const joined = session.replayChunks.join('')
  const kept = joined.length > REPLAY_MAX ? joined.slice(-REPLAY_MAX) : joined
  session.replayChunks = kept ? [kept] : []
  session.replayBytes = kept.length
}

function replayText(session: Session) {
  if (session.replayChunks.length > 1) compactReplay(session)
  return session.replayChunks[0] ?? ''
}

function recentReplay(session: Session, max = 8_000) {
  if (session.replayBytes <= max) {
    return session.replayChunks.join('')
  }
  let out = ''
  for (let i = session.replayChunks.length - 1; i >= 0 && out.length < max; i--) {
    out = session.replayChunks[i] + out
  }
  return out.slice(-max)
}

class PtyManager extends EventEmitter {
  private sessions = new Map<string, Session>()

  getSession(agentId: string) {
    return this.sessions.get(agentId)
  }

  listStatuses() {
    return [...this.sessions.values()].map((s) => ({
      agentId: s.agentId,
      status: s.status,
    }))
  }

  spawn(input: {
    agentId: string
    workspaceId: string
    workspacePath: string
    cli?: CliId
    cols?: number
    rows?: number
  }) {
    if (this.sessions.has(input.agentId)) {
      return this.sessions.get(input.agentId)!
    }

    const cli = getCli(input.cli ?? getSettings().cli)
    const bin = cli.resolveBin()
    if (!bin) {
      throw new Error(
        `${cli.label} CLI was not found. Install it, or pick another CLI in settings.`,
      )
    }
    const cols = input.cols ?? 100
    const rows = input.rows ?? 30

    const env: Record<string, string> = {}
    for (const [key, value] of Object.entries(process.env)) {
      if (typeof value === 'string') env[key] = value
    }
    // The embedded xterm supports color. These CLIs draw the prompt caret as
    // an inverse cell, which disappears when color is disabled.
    delete env.NO_COLOR
    if (env.FORCE_COLOR === '0' || env.FORCE_COLOR === 'false') delete env.FORCE_COLOR
    if (env.COLOR === '0') delete env.COLOR
    env.TERM = 'xterm-256color'
    env.COLORTERM = 'truecolor'
    env.FORCE_COLOR = '3'

    const term = pty.spawn(bin, cli.args(input.workspacePath), {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: input.workspacePath,
      env,
    })

    const session: Session = {
      agentId: input.agentId,
      workspaceId: input.workspaceId,
      workspacePath: input.workspacePath,
      cli: cli.id,
      pty: term,
      sockets: new Set(),
      status: 'working',
      lastActivityAt: Date.now(),
      lastInputAt: 0,
      replayChunks: [],
      replayBytes: 0,
      draft: '',
    }

    this.sessions.set(input.agentId, session)
    void updateAgent(input.workspaceId, input.agentId, { status: 'working' })
    this.emit('status', input.agentId, 'working')

    term.onData((data) => {
      session.lastActivityAt = Date.now()
      appendReplay(session, data)
      for (const socket of session.sockets) {
        if (socket.readyState === socket.OPEN) {
          socket.send(data)
        }
      }
      const typing =
        session.status === 'listening'
        && Date.now() - session.lastInputAt < TYPING_HOLD_MS
      if (!typing) this.setStatus(session, 'working')
      this.armIdleTimer(session)
      if (getCli(session.cli).looksLikeTaskChunk(data)) this.scheduleTaskScan(session)
    })

    term.onExit(({ exitCode }) => {
      this.clearIdleTimer(session)
      const status: AgentStatus = exitCode === 0 ? 'done' : 'done'
      this.setStatus(session, status)
      const goodbye = `\r\n\x1b[90m[agent exited with code ${exitCode}]\x1b[0m\r\n`
      appendReplay(session, goodbye)
      for (const socket of session.sockets) {
        if (socket.readyState === socket.OPEN) {
          socket.send(goodbye)
        }
      }
      this.sessions.delete(input.agentId)
      void this.finishTaskChildren(input.workspaceId, input.agentId)
      this.emit('exit', input.agentId, exitCode)
    })

    this.armIdleTimer(session)
    return session
  }

  attach(agentId: string, socket: WebSocket) {
    const session = this.sessions.get(agentId)
    if (!session) return false

    session.sockets.add(socket)
    const replay = replayText(session)
    if (replay) {
      socket.send(replay)
    }

    socket.on('message', (raw) => {
      const text = typeof raw === 'string' ? raw : raw.toString()
      try {
        const parsed = JSON.parse(text) as {
          type?: string
          cols?: number
          rows?: number
          data?: string
        }
        if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
          session.pty.resize(parsed.cols, parsed.rows)
          return
        }
        if (parsed.type === 'input' && typeof parsed.data === 'string') {
          session.pty.write(parsed.data)
          this.noteTaskInput(session, parsed.data)
          this.markListening(session)
          return
        }
      } catch {
        // plain text input
      }
      session.pty.write(text)
      this.noteTaskInput(session, text)
      this.markListening(session)
    })

    socket.on('close', () => {
      session.sockets.delete(socket)
    })

    return true
  }

  kill(agentId: string) {
    const session = this.sessions.get(agentId)
    if (!session) return false
    this.clearIdleTimer(session)
    session.titleAbort?.abort()
    if (session.taskTimer) {
      clearTimeout(session.taskTimer)
      session.taskTimer = undefined
    }
    try {
      session.pty.kill()
    } catch {
      // already dead
    }
    for (const socket of session.sockets) {
      try {
        socket.close()
      } catch {
        // ignore
      }
    }
    this.sessions.delete(agentId)
    return true
  }

  killWorkspace(workspaceId: string) {
    for (const session of [...this.sessions.values()]) {
      if (session.workspaceId === workspaceId) {
        this.kill(session.agentId)
      }
    }
  }

  private scheduleTaskScan(session: Session) {
    if (session.taskTimer) return
    session.taskTimer = setTimeout(() => {
      session.taskTimer = undefined
      void this.syncTaskChildren(session)
    }, TASK_SCAN_MS)
  }

  private async syncTaskChildren(session: Session) {
    const workspace = await getWorkspace(session.workspaceId)
    if (!workspace) return

    const detected = getCli(session.cli).detectTaskChildren(recentReplay(session))
    const existing = workspace.agents.filter(
      (agent) => agent.parentId === session.agentId && agent.source === 'task',
    )

    if (session.status === 'done' || session.status === 'idle') {
      await this.finishTaskChildren(session.workspaceId, session.agentId, existing)
      return
    }

    for (const item of detected) {
      let child = existing.find((agent) => agent.taskKey === item.key)
      if (!child) {
        const fresh = await getWorkspace(session.workspaceId)
        child = fresh?.agents.find(
          (agent) =>
            agent.parentId === session.agentId && agent.taskKey === item.key,
        )
        if (child) existing.push(child)
      }
      if (item.done) {
        if (child) await this.dropTaskChild(session.workspaceId, child, existing)
        continue
      }
      if (!child) {
        if (existing.length >= TASK_CHILD_CAP) continue
        const parentColor =
          workspace.agents.find((a) => a.id === session.agentId)?.color ?? 0
        const created = await addAgent(session.workspaceId, {
          name: item.name,
          parentId: session.agentId,
          color: (parentColor + 28) % 360,
          source: 'task',
          cli: session.cli,
          taskKey: item.key,
        })
        if (!created) continue
        child = created
        existing.push(created)
        this.emit('spawn', created)
      }
      if (child.status !== 'working') {
        await updateAgent(session.workspaceId, child.id, { status: 'working' })
        this.emit('status', child.id, 'working')
        child.status = 'working'
      }
    }
  }

  private async finishTaskChildren(
    workspaceId: string,
    parentId: string,
    known?: AgentRecord[],
  ) {
    const workspace = known ? null : await getWorkspace(workspaceId)
    const children =
      known
      ?? workspace?.agents.filter(
        (agent) => agent.parentId === parentId && agent.source === 'task',
      )
      ?? []
    for (const child of children) {
      await this.dropTaskChild(workspaceId, child)
    }
  }

  async retireSettledTaskChildren() {
    const workspaces = await listWorkspaces()
    for (const workspace of workspaces) {
      const settledParents = new Set(
        workspace.agents
          .filter((agent) => agent.status === 'done' || agent.status === 'idle')
          .map((agent) => agent.id),
      )
      const present = new Set(workspace.agents.map((agent) => agent.id))
      for (const agent of workspace.agents) {
        if (agent.source !== 'task') continue
        const parentMissing = !agent.parentId || !present.has(agent.parentId)
        const parentSettled = Boolean(agent.parentId && settledParents.has(agent.parentId))
        const taskSettled = agent.status === 'done' || agent.status === 'idle'
        if (parentMissing || parentSettled || taskSettled) {
          await this.dropTaskChild(workspace.id, agent)
        }
      }
    }
  }

  private async dropTaskChild(
    workspaceId: string,
    child: AgentRecord,
    known?: AgentRecord[],
  ) {
    const removed = await removeAgent(workspaceId, child.id)
    if (!removed) return
    const index = known?.findIndex((agent) => agent.id === child.id) ?? -1
    if (known && index >= 0) known.splice(index, 1)
    this.emit('remove', child.id)
  }

  private markListening(session: Session) {
    const now = Date.now()
    session.lastActivityAt = now
    session.lastInputAt = now
    this.setStatus(session, 'listening')
    this.armIdleTimer(session)
  }

  private armIdleTimer(session: Session) {
    this.clearIdleTimer(session)
    const delay = this.idleDelay(session)
    if (delay === null) return

    const started = session.lastActivityAt
    session.idleTimer = setTimeout(() => {
      if (!this.sessions.has(session.agentId)) return
      if (session.lastActivityAt !== started) return
      this.onIdle(session)
    }, delay)
  }

  private idleDelay(session: Session) {
    if (session.status === 'working') {
      const kind = getCli(session.cli).classifyPrompt(recentReplay(session))
      return kind ? WAIT_PROMPT_MS : TASK_DONE_MS
    }
    if (session.status === 'done' || session.status === 'listening') {
      return SLEEP_MS
    }
    return null
  }

  private onIdle(session: Session) {
    if (session.status === 'working') {
      const kind = getCli(session.cli).classifyPrompt(recentReplay(session))
      if (kind === 'permission') {
        this.setStatus(session, 'needs-permission')
        return
      }
      if (kind === 'question') {
        this.setStatus(session, 'needs-question')
        return
      }
      this.setStatus(session, 'done')
      this.armIdleTimer(session)
      void this.finishTaskChildren(session.workspaceId, session.agentId)
      return
    }
    if (session.status === 'done' || session.status === 'listening') {
      this.setStatus(session, 'idle')
      void this.finishTaskChildren(session.workspaceId, session.agentId)
    }
  }

  private clearIdleTimer(session: Session) {
    if (session.idleTimer) {
      clearTimeout(session.idleTimer)
      session.idleTimer = undefined
    }
  }

  private noteTaskInput(session: Session, data: string) {
    const next = consumeInput(session.draft, data)
    session.draft = next.draft
    if (next.submitted === null) return
    const request = taskText(next.submitted)
    if (!request) return
    this.retitle(session, request)
  }

  private retitle(session: Session, request: string) {
    session.titleAbort?.abort()
    const abort = new AbortController()
    session.titleAbort = abort
    const bin = getCli(session.cli).resolveBin()
    if (!bin) return
    const currentTitle = session.summary
    void requestTitle({
      bin,
      cli: session.cli,
      request,
      currentTitle,
      signal: abort.signal,
    }).then((title) => {
      if (abort.signal.aborted || !title || title === session.summary) return
      if (!this.sessions.has(session.agentId)) return
      session.summary = title
      this.emit('summary', session.agentId, title)
    })
  }

  private setStatus(session: Session, status: AgentStatus) {
    if (session.status === status) return
    session.status = status
    void updateAgent(session.workspaceId, session.agentId, { status })
    this.emit('status', session.agentId, status)
  }
}

export const ptyManager = new PtyManager()
