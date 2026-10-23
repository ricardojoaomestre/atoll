import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createWorkspace, deleteWorkspace } from '../lib/api'
import { useWorkspaces } from '../hooks/use-workspaces'
import { NewWorkspaceDialog } from '../components/new-workspace-dialog'
import { SettingsDialog } from '../components/settings-dialog'
import { ShipLog } from '../components/ship-log'
import { Compass, Monocular, SeaChart } from '../components/chart-art'
import { WorkspaceCard } from '../components/workspace-card'
import { CHART_SCALE, chartBand, nextWave, type ChartBand } from '../lib/chart'
import type { Workspace } from '../types'

const BANDS: ChartBand[] = ['horizon', 'work', 'flag', 'wave']

function matePath(workspaceId: string, agentId: string) {
  return `/workspace/${workspaceId}?mate=${encodeURIComponent(agentId)}`
}

export function MapPage() {
  const { workspaces, log, loading, error, refresh } = useWorkspaces()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const wave = nextWave(workspaces)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'n' && event.key !== 'N') return
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
      if (open || settingsOpen) return
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, textarea')) return
      const next = nextWave(workspaces)
      if (!next) return
      event.preventDefault()
      navigate(matePath(next.workspaceId, next.agentId))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, open, settingsOpen, workspaces])

  return (
    <main className="relative min-h-screen px-6 py-8 pb-52">
      <div className="stars pointer-events-none absolute inset-0" />

      <header className="relative mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="sky-title font-display text-2xl leading-relaxed text-primary sm:text-3xl">
            ATOLL
          </h1>
          {loading && (
            <p className="sky-note mt-3 font-mono text-2xl text-muted-foreground">
              Scanning the archipelago...
            </p>
          )}
          {error && workspaces.length > 0 && (
            <p className="mt-2 font-mono text-xl text-destructive">{error}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="pixel-btn bg-muted px-4 py-3"
          >
            SETTINGS
          </button>
          {wave && (
            <button
              type="button"
              onClick={() => navigate(matePath(wave.workspaceId, wave.agentId))}
              className="pixel-btn bg-warning px-4 py-3 text-primary-foreground"
            >
              N · NEXT WAVE
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pixel-btn bg-primary px-4 py-3 text-primary-foreground"
          >
            + NEW WORKSPACE
          </button>
        </div>
      </header>

      <section className="relative mx-auto mt-16 flex max-w-5xl flex-col items-center gap-2">
        {loading && (
          <div className="flex items-end justify-center gap-12 py-6">
            <Monocular />
            <Compass />
          </div>
        )}
        {!loading && workspaces.length === 0 && (
          <div className="pixel-box max-w-md bg-card/80 p-6 text-center">
            <SeaChart />
            <p className="font-display text-xs text-primary">
              {error ? 'HERDR IS QUIET' : 'EMPTY SEAS'}
            </p>
            <p className="mt-3 font-mono text-2xl text-muted-foreground">
              {error
                ? error
                : 'No islands yet. Create a workspace pointing at a local folder, then spawn agents on it.'}
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="pixel-btn mt-5 bg-primary px-4 py-3 text-primary-foreground"
            >
              + NEW WORKSPACE
            </button>
          </div>
        )}

        <Chart workspaces={workspaces} onDelete={async (ws) => {
          if (!confirm(`Close the Herdr workspace "${ws.name}" and every pane on it?`)) return
          await deleteWorkspace(ws.id)
          await refresh()
        }} />
      </section>

      <ShipLog
        entries={log}
        onOpen={(entry) => navigate(matePath(entry.workspaceId, entry.agentId))}
      />

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <NewWorkspaceDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreate={async (name, path) => {
          await createWorkspace(name, path)
          await refresh()
        }}
      />
    </main>
  )
}

function Chart({
  workspaces,
  onDelete,
}: {
  workspaces: Workspace[]
  onDelete: (workspace: Workspace) => Promise<void>
}) {
  const occupied = BANDS.map((band) => ({
    band,
    items: workspaces.filter((workspace) => chartBand(workspace.agents) === band),
  })).filter((row) => row.items.length > 0)
  const stacked = occupied.length > 1

  return (
    <>
      {occupied.map((row) => (
        <div
          key={row.band}
          className={`flex flex-wrap items-end justify-center ${
            stacked && row.band === 'wave' ? 'gap-12' : 'gap-8'
          }`}
        >
          {row.items.map((workspace) => (
            <div
              key={workspace.id}
              data-band={row.band}
              className="group/card relative"
              style={{
                transform: `scale(${stacked ? CHART_SCALE[row.band] : 1})`,
                transformOrigin: 'bottom center',
              }}
            >
              <WorkspaceCard workspace={workspace} />
              <button
                type="button"
                title="Delete workspace"
                onClick={() => void onDelete(workspace)}
                className="pixel-btn absolute -right-2 -top-2 bg-destructive px-2 py-1 text-[8px] text-destructive-foreground opacity-0 transition group-hover/card:opacity-100 focus:opacity-100"
              >
                X
              </button>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
