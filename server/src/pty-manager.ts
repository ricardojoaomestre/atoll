import { EventEmitter } from 'node:events'
import * as pty from 'node-pty-prebuilt-multiarch'
import type { IPty } from 'node-pty-prebuilt-multiarch'
import type { WebSocket } from 'ws'
import { resolveAgentBin } from './agent-bin.js'
import { classifyPrompt } from './permission-detect.js'
import { detectTaskChildren, looksLikeTaskChunk } from './task-detect.js'
import { addAgent, getWorkspace, updateAgent } from './store.js'
import type { AgentRecord, AgentStatus } from './types.js'

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
  pty: IPty
  sockets: Set<WebSocket>
  status: AgentStatus
  lastActivityAt: number
  lastInputAt: number
  idleTimer?: ReturnType<typeof setTimeout>
  taskTimer?: ReturnType<typeof setTimeout>
  replayChunks: string[]
  replayBytes: number
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
    cols?: number
    rows?: number
  }) {
    if (this.sessions.has(input.agentId)) {
      return this.sessions.get(input.agentId)!
    }

    const bin = resolveAgentBin()
    const cols = input.cols ?? 100
    const rows = input.rows ?? 30

    const env: Record<string, string> = {}
    for (const [key, value] of Object.entries(process.env)) {
      if (typeof value === 'string') env[key] = value
    }
    env.TERM = 'xterm-256color'
    env.COLORTERM = 'truecolor'

    const term = pty.spawn(bin, ['--workspace', input.workspacePath, '--trust'], {
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
      pty: term,
      sockets: new Set(),
      status: 'working',
      lastActivityAt: Date.now(),
      lastInputAt: 0,
      replayChunks: [],
      replayBytes: 0,
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
      if (looksLikeTaskChunk(data)) this.scheduleTaskScan(session)
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
          this.markListening(session)
          return
        }
      } catch {
        // plain text input
      }
      session.pty.write(text)
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

    const detected = detectTaskChildren(recentReplay(session))
    const existing = workspace.agents.filter(
      (agent) => agent.parentId === session.agentId && agent.source === 'task',
    )

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
      if (!child) {
        if (existing.length >= TASK_CHILD_CAP) continue
        const parentColor =
          workspace.agents.find((a) => a.id === session.agentId)?.color ?? 0
        const created = await addAgent(session.workspaceId, {
          name: item.name,
          parentId: session.agentId,
          color: (parentColor + 28) % 360,
          source: 'task',
          taskKey: item.key,
        })
        if (!created) continue
        child = created
        existing.push(created)
        this.emit('spawn', created)
      }
      const status: AgentStatus = item.done ? 'done' : 'working'
      if (child.status !== status) {
        await updateAgent(session.workspaceId, child.id, { status })
        this.emit('status', child.id, status)
        child.status = status
      }
    }

    if (session.status === 'done' || session.status === 'idle') {
      await this.finishTaskChildren(session.workspaceId, session.agentId, existing)
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
      if (child.status === 'working') {
        await updateAgent(workspaceId, child.id, { status: 'done' })
        this.emit('status', child.id, 'done')
      }
    }
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
      const kind = classifyPrompt(recentReplay(session))
      return kind ? WAIT_PROMPT_MS : TASK_DONE_MS
    }
    if (session.status === 'done' || session.status === 'listening') {
      return SLEEP_MS
    }
    return null
  }

  private onIdle(session: Session) {
    if (session.status === 'working') {
      const kind = classifyPrompt(recentReplay(session))
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

  private setStatus(session: Session, status: AgentStatus) {
    if (session.status === status) return
    session.status = status
    void updateAgent(session.workspaceId, session.agentId, { status })
    this.emit('status', session.agentId, status)
  }
}

export const ptyManager = new PtyManager()
