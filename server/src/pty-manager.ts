import { EventEmitter } from 'node:events'
import * as pty from 'node-pty-prebuilt-multiarch'
import type { IPty } from 'node-pty-prebuilt-multiarch'
import type { WebSocket } from 'ws'
import { resolveAgentBin } from './agent-bin.js'
import { looksLikePermissionPrompt } from './permission-detect.js'
import { updateAgent } from './store.js'
import type { AgentStatus } from './types.js'

const IDLE_DONE_MS = 8_000
const IDLE_PERMISSION_MS = 1_500
const REPLAY_MAX = 200_000
const REPLAY_COMPACT_AT = 240_000

interface Session {
  agentId: string
  workspaceId: string
  workspacePath: string
  pty: IPty
  sockets: Set<WebSocket>
  status: AgentStatus
  lastOutputAt: number
  idleTimer?: ReturnType<typeof setTimeout>
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
      lastOutputAt: Date.now(),
      replayChunks: [],
      replayBytes: 0,
    }

    this.sessions.set(input.agentId, session)
    void updateAgent(input.workspaceId, input.agentId, { status: 'working' })
    this.emit('status', input.agentId, 'working')

    term.onData((data) => {
      session.lastOutputAt = Date.now()
      appendReplay(session, data)
      for (const socket of session.sockets) {
        if (socket.readyState === socket.OPEN) {
          socket.send(data)
        }
      }
      this.setStatus(session, 'working')
      this.armIdleTimer(session)
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
          session.lastOutputAt = Date.now()
          if (
            session.status === 'needs-input'
            || session.status === 'done'
            || session.status === 'listening'
          ) {
            this.setStatus(session, 'working')
          }
          this.armIdleTimer(session)
          return
        }
      } catch {
        // plain text input
      }
      session.pty.write(text)
      session.lastOutputAt = Date.now()
      if (
        session.status === 'needs-input'
        || session.status === 'done'
        || session.status === 'listening'
      ) {
        this.setStatus(session, 'working')
      }
      this.armIdleTimer(session)
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

  private armIdleTimer(session: Session) {
    this.clearIdleTimer(session)
    const permission = looksLikePermissionPrompt(recentReplay(session))
    const delay = permission ? IDLE_PERMISSION_MS : IDLE_DONE_MS
    session.idleTimer = setTimeout(() => {
      if (!this.sessions.has(session.agentId)) return
      if (Date.now() - session.lastOutputAt < delay) return
      this.setStatus(
        session,
        looksLikePermissionPrompt(recentReplay(session))
          ? 'needs-input'
          : 'listening',
      )
    }, delay)
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
