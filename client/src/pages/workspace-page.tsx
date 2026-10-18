import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  dismissAgent,
  getWorkspace,
  spawnAgent,
  spawnSubAgent,
  wsUrl,
} from '../lib/api'
import { AgentSprite } from '../components/agent-sprite'
import { AgentTerminal } from '../components/agent-terminal'
import { Island } from '../components/island'
import { countByStatus } from '../lib/status'
import type { Agent, AgentStatus, Workspace } from '../types'

export function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!id) return
    try {
      const data = await getWorkspace(id)
      setWorkspace(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Not found')
      setWorkspace(null)
    }
  }, [id])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 4000)
    return () => window.clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    const socket = new WebSocket(wsUrl('/api/events'))
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as {
          type: string
          agentId: string
          status?: AgentStatus
        }
        if (msg.type === 'status' && msg.status) {
          setWorkspace((prev) =>
            prev
              ? {
                  ...prev,
                  agents: prev.agents.map((a) =>
                    a.id === msg.agentId ? { ...a, status: msg.status! } : a,
                  ),
                }
              : prev,
          )
        }
        if (msg.type === 'exit') {
          setWorkspace((prev) =>
            prev
              ? {
                  ...prev,
                  agents: prev.agents.map((a) =>
                    a.id === msg.agentId ? { ...a, status: 'done' } : a,
                  ),
                }
              : prev,
          )
        }
      } catch {
        // ignore
      }
    }
    return () => socket.close()
  }, [])

  if (error && !workspace) {
    return (
      <div className="p-10 font-display text-xs">
        Island not found.{' '}
        <Link to="/" className="text-primary">
          Back
        </Link>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="p-10 font-mono text-2xl text-muted-foreground">
        Loading island...
      </div>
    )
  }

  const roots = workspace.agents.filter((a) => !a.parentId)
  const selected = workspace.agents.find((a) => a.id === selectedId) ?? null

  async function onSpawn() {
    setBusy(true)
    try {
      const agent = await spawnAgent(workspace!.id)
      await refresh()
      setSelectedId(agent.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Spawn failed')
    } finally {
      setBusy(false)
    }
  }

  async function onSub(parent: Agent) {
    setBusy(true)
    try {
      const agent = await spawnSubAgent(workspace!.id, parent.id)
      await refresh()
      setSelectedId(agent.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sub-agent failed')
    } finally {
      setBusy(false)
    }
  }

  async function onDismiss(agent: Agent) {
    setBusy(true)
    try {
      await dismissAgent(workspace!.id, agent.id)
      if (selectedId === agent.id) setSelectedId(null)
      await refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Dismiss failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8">
      <div className="stars pointer-events-none absolute inset-0" />

      <header className="relative mx-auto flex max-w-5xl flex-wrap items-center gap-4">
        <Link to="/" className="pixel-btn bg-muted px-3 py-2">
          ◀ MAP
        </Link>
        <div>
          <h1 className="font-display text-lg text-primary">{workspace.name}</h1>
          <p className="font-mono text-lg text-muted-foreground">{workspace.path}</p>
        </div>
        <div className="ml-auto flex gap-2 font-display text-[8px]">
          <span className="pixel-box bg-secondary px-2 py-1 text-secondary-foreground">
            ⚙ {countByStatus(workspace.agents, 'working')}
          </span>
          <span className="pixel-box bg-warning px-2 py-1 text-primary-foreground">
            ! {countByStatus(workspace.agents, 'needs-input')}
          </span>
          <span className="pixel-box bg-success px-2 py-1 text-primary-foreground">
            ★ {countByStatus(workspace.agents, 'done')}
          </span>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSpawn()}
          className="pixel-btn bg-primary px-4 py-3 text-primary-foreground"
        >
          + SPAWN AGENT
        </button>
      </header>

      <section
        className="relative mx-auto mt-24 max-w-5xl animate-float"
        style={{ animationDuration: '6s' }}
      >
        <div className="relative flex min-h-56 flex-wrap items-end justify-center gap-10 px-6 pb-0">
          {roots.length === 0 && (
            <p className="pb-6 font-mono text-2xl text-muted-foreground">
              An empty island... spawn your first agent!
            </p>
          )}
          {roots.map((agent) => (
            <div key={agent.id} className="flex items-end gap-1">
              <AgentSprite
                agent={agent}
                selected={selectedId === agent.id}
                onClick={() => {
                  setSelectedId(agent.id)
                  if (agent.status === 'done') {
                    setWorkspace((prev) =>
                      prev
                        ? {
                            ...prev,
                            agents: prev.agents.map((a) =>
                              a.id === agent.id ? { ...a, status: 'idle' } : a,
                            ),
                          }
                        : prev,
                    )
                  }
                }}
              />
              {workspace.agents
                .filter((a) => a.parentId === agent.id)
                .map((child) => (
                  <AgentSprite
                    key={child.id}
                    small
                    agent={child}
                    selected={selectedId === child.id}
                    onClick={() => setSelectedId(child.id)}
                  />
                ))}
            </div>
          ))}
        </div>
        <Island hue={workspace.hue} wide />
      </section>

      {selected && (
        <AgentTerminal
          workspaceId={workspace.id}
          agent={selected}
          onClose={() => setSelectedId(null)}
          onSubAgent={() => void onSub(selected)}
          onDismiss={() => void onDismiss(selected)}
        />
      )}
    </main>
  )
}
