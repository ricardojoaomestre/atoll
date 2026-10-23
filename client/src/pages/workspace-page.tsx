import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  answerAgent,
  agentResult,
  dismissAgent,
  focusAgent,
  getWorkspace,
  promptAgent,
  spawnAgent,
} from '../lib/api'
import { subscribeAgentEvents } from '../lib/events'
import { AgentDialogue } from '../components/agent-dialogue'
import { AgentSession } from '../components/agent-session'
import { AgentSprite } from '../components/agent-sprite'
import { Beach } from '../components/beach'
import { SettingsDialog } from '../components/settings-dialog'
import { SpawnAgentDialog } from '../components/spawn-agent-dialog'
import { Island } from '../components/island'
import { composerMode } from '../lib/composer'
import { nextMate } from '../lib/chart'
import { countByStatus } from '../lib/status'
import { treeCount } from '../lib/tree-count'
import type { Agent, Workspace } from '../types'

export function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const mate = searchParams.get('mate')
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [spawnOpen, setSpawnOpen] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [resultPending, setResultPending] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [pinnedId, setPinnedId] = useState<string | null>(mate)
  const [focusSpeech, setFocusSpeech] = useState(Boolean(mate))
  const hoverTimer = useRef<number | undefined>(undefined)
  const appliedMate = useRef<string | null>(null)

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current !== undefined) {
      window.clearTimeout(hoverTimer.current)
      hoverTimer.current = undefined
    }
  }, [])

  const showHovered = useCallback(
    (agentId: string) => {
      clearHoverTimer()
      setHoveredId(agentId)
      const agent = workspace?.agents.find((item) => item.id === agentId)
      if (agent && composerMode(agent.status)) setPinnedId(agentId)
    },
    [clearHoverTimer, workspace],
  )

  const scheduleHideHovered = useCallback(() => {
    clearHoverTimer()
    hoverTimer.current = window.setTimeout(() => {
      hoverTimer.current = undefined
      setHoveredId(null)
    }, 120)
  }, [clearHoverTimer])

  useEffect(() => clearHoverTimer, [clearHoverTimer])

  const openAgent = useCallback((agent: Agent) => {
    if (agent.source === 'task') return
    clearHoverTimer()
    setHoveredId(null)
    setNotice(null)
    setSelectedId(agent.id)
    void focusAgent(agent.workspaceId, agent.id).catch((err: unknown) => {
      setNotice(err instanceof Error ? err.message : 'Could not focus that pane')
    })
  }, [clearHoverTimer])

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
    if (!selectedId || !workspace) return
    if (!workspace.agents.some((agent) => agent.id === selectedId)) {
      setSelectedId(null)
    }
  }, [workspace, selectedId])

  useEffect(() => {
    return subscribeAgentEvents({
      onReconnect: () => {
        void refresh()
      },
      onEvent: (msg) => {
        if (msg.type === 'sync') {
          void refresh()
          return
        }
        if (msg.type === 'spawn' && msg.agent) {
          const spawned = msg.agent
          setWorkspace((prev) => {
            if (!prev || prev.id !== spawned.workspaceId) return prev
            if (prev.agents.some((a) => a.id === spawned.id)) return prev
            return { ...prev, agents: [...prev.agents, spawned] }
          })
        }
        if (msg.type === 'summary' && msg.agentId && msg.summary) {
          const summary = msg.summary
          setWorkspace((prev) =>
            prev
              ? {
                  ...prev,
                  agents: prev.agents.map((a) =>
                    a.id === msg.agentId ? { ...a, summary } : a,
                  ),
                }
              : prev,
          )
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
        if (msg.type === 'remove' && msg.agentId) {
          const agentId = msg.agentId
          setSelectedId((current) => (current === agentId ? null : current))
          setWorkspace((prev) =>
            prev
              ? {
                  ...prev,
                  agents: prev.agents.filter(
                    (agent) => agent.id !== agentId && agent.parentId !== agentId,
                  ),
                }
              : prev,
          )
        }
      },
    })
  }, [refresh])

  const onSpawn = useCallback(async (task: string, kind: string) => {
    if (!workspace) return
    setBusy(true)
    try {
      const agent = await spawnAgent(workspace.id, task, kind)
      await refresh()
      openAgent(agent)
    } finally {
      setBusy(false)
    }
  }, [workspace, refresh, openAgent])

  const onDismiss = useCallback(
    async (agent: Agent) => {
      if (!workspace) return
      if (!confirm(`Close the Herdr pane for ${agent.name}?`)) return
      setBusy(true)
      try {
        await dismissAgent(workspace.id, agent.id)
        setSelectedId((current) => (current === agent.id ? null : current))
        await refresh()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Dismiss failed')
      } finally {
        setBusy(false)
      }
    },
    [workspace, refresh],
  )

  const onSpeak = useCallback(
    async (agent: Agent, text: string) => {
      if (!workspace) return
      const mode = composerMode(agent.status)
      if (!mode) return
      setBusy(true)
      setSpeechError(null)
      try {
        if (mode === 'note') await promptAgent(workspace.id, agent.id, text)
        else await answerAgent(workspace.id, agent.id, text)
        await refresh()
      } catch (err) {
        setSpeechError(err instanceof Error ? err.message : 'The sea swallowed that')
      } finally {
        setBusy(false)
      }
    },
    [workspace, refresh],
  )

  useEffect(() => {
    if (!mate || appliedMate.current === mate) return
    if (!workspace?.agents.some((agent) => agent.id === mate)) return
    appliedMate.current = mate
    setPinnedId(mate)
    setFocusSpeech(true)
  }, [mate, workspace])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPinnedId(null)
        setHoveredId(null)
        setFocusSpeech(false)
        return
      }
      if (event.key !== 'n' && event.key !== 'N') return
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
      if (selectedId) return
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, textarea')) return
      if (!workspace) return
      const next = nextMate(workspace.agents, pinnedId)
      if (!next) return
      event.preventDefault()
      setHoveredId(null)
      setPinnedId(next)
      setFocusSpeech(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [workspace, pinnedId, selectedId])

  const selectedStatus = workspace?.agents.find((agent) => agent.id === selectedId)?.status
  useEffect(() => {
    if (!id || !selectedId) return
    let cancelled = false
    setLastResult(null)
    setResultPending(true)
    agentResult(id, selectedId)
      .then((body) => {
        if (!cancelled) setLastResult(body.text)
      })
      .catch(() => {
        if (!cancelled) setLastResult(null)
      })
      .finally(() => {
        if (!cancelled) setResultPending(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, selectedId, selectedStatus])

  if (error && !workspace) {
    const missing = error === 'not found'
    return (
      <div className="sky-note p-10 font-display text-xs">
        {missing ? 'Island not found.' : error}{' '}
        <Link to="/" className="sky-title text-primary">
          Back
        </Link>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="sky-note p-10 font-mono text-2xl text-muted-foreground">
        Loading island...
      </div>
    )
  }

  const docks = workspace.tabs ?? []
  const showDocks = docks.length > 1
  const groups = showDocks
    ? docks.map((tab) => ({
        id: tab.id,
        label: tab.label,
        agents: workspace.agents.filter(
          (agent) => !agent.parentId && agent.tabId === tab.id,
        ),
      }))
    : [
        {
          id: 'all',
          label: '',
          agents: workspace.agents.filter((agent) => !agent.parentId),
        },
      ]
  const ungrouped = showDocks
    ? workspace.agents.filter(
        (agent) =>
          !agent.parentId && !docks.some((tab) => tab.id === agent.tabId),
      )
    : []
  if (ungrouped.length > 0) {
    groups.push({ id: 'loose', label: 'other', agents: ungrouped })
  }
  const focused = selectedId !== null
  const focusedAgent =
    workspace.agents.find((a) => a.id === selectedId) ?? null
  const spokenAgent = focused
    ? null
    : workspace.agents.find((agent) => agent.id === (hoveredId ?? pinnedId)) ?? null

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
          <h1 className="sky-title font-display text-lg text-primary">{workspace.name}</h1>
          <p className="sky-note font-mono text-lg text-muted-foreground">
            {workspace.path || 'Herdr workspace'}
          </p>
          {notice && (
            <p className="mt-1 font-mono text-xl text-destructive">{notice}</p>
          )}
        </div>
        <div className="ml-auto flex flex-wrap gap-2 font-display text-[8px]">
          <span className="pixel-box bg-secondary px-2 py-1 text-secondary-foreground">
            ⚙ {countByStatus(workspace.agents, 'working')}
          </span>
          {countByStatus(workspace.agents, 'needs-question') > 0 ? (
            <button
              type="button"
              onClick={() => {
                const next = nextMate(workspace.agents, pinnedId)
                if (!next) return
                setHoveredId(null)
                setPinnedId(next)
                setFocusSpeech(true)
              }}
              className="pixel-box bg-warning px-2 py-1 text-primary-foreground"
            >
              ? {countByStatus(workspace.agents, 'needs-question')}
            </button>
          ) : (
            <span className="pixel-box bg-warning px-2 py-1 text-primary-foreground">
              ? 0
            </span>
          )}
          <span className="pixel-box bg-success px-2 py-1 text-primary-foreground">
            ✓ {countByStatus(workspace.agents, 'done')}
          </span>
          <span className="pixel-box bg-muted px-2 py-1 text-muted-foreground">
            z {countByStatus(workspace.agents, 'idle')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="pixel-btn bg-muted px-4 py-3"
        >
          SETTINGS
        </button>
        <button
          type="button"
          disabled={busy || focused}
          onClick={() => setSpawnOpen(true)}
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
              : 'scale-100 overflow-y-auto pb-28 opacity-100'
          }`}
        >
          <div
            className="flex w-full flex-col animate-float"
            style={{ animationDuration: '6s' }}
          >
            <div className="relative z-10 flex min-h-56 w-full flex-wrap items-end justify-center gap-16 px-6 pb-0">
              {workspace.agents.length === 0 && (
                <p className="sky-note pb-6 font-mono text-2xl text-muted-foreground">
                  An empty island... spawn your first agent!
                </p>
              )}
              {workspace.agents.length > 0 && groups.map((group) => (
                <div key={group.id} className="flex w-full flex-col items-center gap-3">
                  {showDocks && (
                    <p className="font-display text-[8px] text-primary">
                      DOCK {group.label}
                    </p>
                  )}
                  {group.agents.length === 0 && showDocks ? (
                    <span className="pb-4 font-mono text-2xl text-muted-foreground/50">
                      ·
                    </span>
                  ) : (
                    <Beach
                      hue={workspace.hue}
                      trees={treeCount(workspace.firstCommitAt)}
                      camp={workspace.hasCamp}
                      agents={group.agents}
                      childrenOf={(agentId) =>
                        workspace.agents.filter((child) => child.parentId === agentId)
                      }
                      selectedId={selectedId}
                      onOpen={openAgent}
                      onEnter={showHovered}
                      onLeave={scheduleHideHovered}
                    />
                  )}
                </div>
              ))}
            </div>
            {workspace.agents.length === 0 && (
              <Island
                hue={workspace.hue}
                wide
                trees={treeCount(workspace.firstCommitAt)}
                camp={workspace.hasCamp}
              />
            )}
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
              <div className="flex max-w-full flex-col items-center">
                <div className="origin-center scale-[2.2] sm:scale-[2.6]">
                  <AgentSprite
                    agent={focusedAgent}
                    selected
                    onClick={hideTerminal}
                  />
                </div>
                {focusedAgent.summary && (
                  <p className="on-sky mt-24 line-clamp-2 max-w-[15rem] text-center font-mono text-2xl leading-tight text-foreground">
                    {focusedAgent.summary}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="relative min-h-[55vh] w-full min-w-0 flex-1 sm:min-h-0">
            {focusedAgent && (
              <AgentSession
                agent={focusedAgent}
                busy={busy}
                error={speechError}
                result={lastResult}
                resultPending={resultPending}
                onHide={hideTerminal}
                onAnother={() => setSpawnOpen(true)}
                onDismiss={() => void onDismiss(focusedAgent)}
                onSpeak={(text) => void onSpeak(focusedAgent, text)}
              />
            )}
          </div>
        </section>
      </div>
      {spokenAgent && (
        <AgentDialogue
          agent={spokenAgent}
          busy={busy}
          error={speechError}
          autoFocus={focusSpeech && hoveredId === null && spokenAgent.id === pinnedId}
          onSubmit={(text) => void onSpeak(spokenAgent, text)}
          onClose={() => {
            setPinnedId(null)
            setHoveredId(null)
            setFocusSpeech(false)
          }}
          onPointerEnter={clearHoverTimer}
          onPointerLeave={scheduleHideHovered}
        />
      )}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SpawnAgentDialog
        open={spawnOpen}
        onClose={() => setSpawnOpen(false)}
        onSpawn={onSpawn}
      />
    </main>
  )
}
