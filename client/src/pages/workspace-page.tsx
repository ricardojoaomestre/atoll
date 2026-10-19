import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  dismissAgent,
  getWorkspace,
  spawnAgent,
  spawnSubAgent,
} from '../lib/api'
import { subscribeAgentEvents } from '../lib/events'
import { AgentSprite } from '../components/agent-sprite'
import { AgentTerminal } from '../components/agent-terminal'
import { Island } from '../components/island'
import { countByStatus } from '../lib/status'
import { treeCount } from '../lib/tree-count'
import type { Agent, Workspace } from '../types'

export function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openTerminalIds, setOpenTerminalIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const openAgent = useCallback((agent: Agent) => {
    const terminalId =
      agent.source === 'task' && agent.parentId ? agent.parentId : agent.id
    setSelectedId(agent.id)
    setOpenTerminalIds((prev) =>
      prev.includes(terminalId) ? prev : [...prev, terminalId],
    )
  }, [])

  const hideTerminal = useCallback(() => {
    setSelectedId(null)
  }, [])

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
  }, [refresh])

  useEffect(() => {
    return subscribeAgentEvents({
      onReconnect: () => {
        void refresh()
      },
      onEvent: (msg) => {
        if (msg.type === 'spawn' && msg.agent) {
          const spawned = msg.agent
          setWorkspace((prev) => {
            if (!prev || prev.id !== spawned.workspaceId) return prev
            if (prev.agents.some((a) => a.id === spawned.id)) return prev
            return { ...prev, agents: [...prev.agents, spawned] }
          })
        }
        if (msg.type === 'status' && msg.status) {
          const status = msg.status
          setWorkspace((prev) =>
            prev
              ? {
                  ...prev,
                  agents: prev.agents.map((a) =>
                    a.id === msg.agentId ? { ...a, status } : a,
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
      },
    })
  }, [refresh])

  const onSpawn = useCallback(async () => {
    if (!workspace) return
    setBusy(true)
    try {
      const agent = await spawnAgent(workspace.id)
      await refresh()
      openAgent(agent)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Spawn failed')
    } finally {
      setBusy(false)
    }
  }, [workspace, refresh, openAgent])

  const onSub = useCallback(
    async (parent: Agent) => {
      if (!workspace) return
      setBusy(true)
      try {
        const agent = await spawnSubAgent(workspace.id, parent.id)
        await refresh()
        openAgent(agent)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Sub-agent failed')
      } finally {
        setBusy(false)
      }
    },
    [workspace, refresh, openAgent],
  )

  const onDismiss = useCallback(
    async (agent: Agent) => {
      if (!workspace) return
      setBusy(true)
      try {
        await dismissAgent(workspace.id, agent.id)
        setOpenTerminalIds((prev) => prev.filter((openId) => openId !== agent.id))
        setSelectedId((current) => {
          if (current === agent.id) return null
          const selected = workspace.agents.find((a) => a.id === current)
          return selected?.parentId === agent.id ? null : current
        })
        await refresh()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Dismiss failed')
      } finally {
        setBusy(false)
      }
    },
    [workspace, refresh],
  )

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
  const focused = selectedId !== null
  const focusedAgent =
    workspace.agents.find((a) => a.id === selectedId) ?? null

  return (
    <main
      className={`relative flex min-h-screen flex-col overflow-hidden py-4 ${
        focused ? 'is-focused px-3 sm:px-4' : 'px-6 py-8'
      }`}
    >
      <div className="stars pointer-events-none absolute inset-0" />

      <header
        className={`relative z-20 mx-auto flex w-full flex-wrap items-center gap-4 ${
          focused ? 'max-w-none' : 'max-w-6xl'
        }`}
      >
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
          <span className="pixel-box bg-primary px-2 py-1 text-primary-foreground">
            ··· {countByStatus(workspace.agents, 'listening')}
          </span>
          <span className="pixel-box bg-warning px-2 py-1 text-primary-foreground">
            ? {countByStatus(workspace.agents, 'needs-question')}
          </span>
          <span className="pixel-box bg-warning px-2 py-1 text-primary-foreground">
            OK? {countByStatus(workspace.agents, 'needs-permission')}
          </span>
          <span className="pixel-box bg-success px-2 py-1 text-primary-foreground">
            ✓ {countByStatus(workspace.agents, 'done')}
          </span>
        </div>
        <button
          type="button"
          disabled={busy || focused}
          onClick={() => void onSpawn()}
          className="pixel-btn bg-primary px-4 py-3 text-primary-foreground disabled:opacity-40"
        >
          + SPAWN AGENT
        </button>
      </header>

      <div
        className={`relative mx-auto mt-4 min-h-0 w-full flex-1 ${
          focused ? 'max-w-none' : 'max-w-6xl'
        }`}
      >
        <section
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-out ${
            focused
              ? 'pointer-events-none scale-150 opacity-0'
              : 'scale-100 opacity-100'
          }`}
        >
          <div
            className="flex w-full flex-col animate-float"
            style={{ animationDuration: '6s' }}
          >
            <div className="relative z-10 flex min-h-56 flex-wrap items-end justify-center gap-10 px-6 pb-0">
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
                    onClick={() => openAgent(agent)}
                  />
                  {workspace.agents
                    .filter((a) => a.parentId === agent.id)
                    .map((child) => (
                      <AgentSprite
                        key={child.id}
                        small
                        agent={child}
                        selected={selectedId === child.id}
                        onClick={() => openAgent(child)}
                      />
                    ))}
                </div>
              ))}
            </div>
            <Island
              hue={workspace.hue}
              wide
              trees={treeCount(workspace.firstCommitAt)}
              camp={workspace.hasCamp}
            />
          </div>
        </section>

        <section
          className={`absolute inset-0 flex flex-col gap-3 transition-all duration-500 ease-out sm:flex-row sm:gap-4 ${
            focused
              ? 'pointer-events-auto scale-100 opacity-100'
              : 'pointer-events-none scale-90 opacity-0'
          }`}
        >
          <div className="relative flex w-full shrink-0 flex-col items-center justify-center sm:w-[28%] lg:w-[24%]">
            {focusedAgent && (
              <div className="origin-center scale-[2.2] sm:scale-[2.6]">
                <AgentSprite
                  agent={focusedAgent}
                  selected
                  onClick={hideTerminal}
                />
              </div>
            )}
          </div>

          <div className="relative min-h-[55vh] w-full min-w-0 flex-1 sm:min-h-0">
            {workspace.agents
              .filter(
                (agent) =>
                  agent.source !== 'task' && openTerminalIds.includes(agent.id),
              )
              .map((agent) => {
                const viewingTaskChild = workspace.agents.some(
                  (child) =>
                    child.id === selectedId
                    && child.source === 'task'
                    && child.parentId === agent.id,
                )
                return (
                  <AgentTerminal
                    key={agent.id}
                    agent={agent}
                    visible={selectedId === agent.id || viewingTaskChild}
                    onClose={hideTerminal}
                    onSubAgent={onSub}
                    onDismiss={onDismiss}
                  />
                )
              })}
          </div>
        </section>
      </div>
    </main>
  )
}
