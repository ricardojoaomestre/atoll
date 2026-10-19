import { useState } from 'react'
import { createWorkspace, deleteWorkspace } from '../lib/api'
import { useWorkspaces } from '../hooks/use-workspaces'
import { NewWorkspaceDialog } from '../components/new-workspace-dialog'
import { SettingsDialog } from '../components/settings-dialog'
import { Compass, Monocular, SeaChart } from '../components/chart-art'
import { WorkspaceCard } from '../components/workspace-card'

export function MapPage() {
  const { workspaces, loading, error, refresh } = useWorkspaces()
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8">
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
          {error && (
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
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pixel-btn bg-primary px-4 py-3 text-primary-foreground"
          >
            + NEW WORKSPACE
          </button>
        </div>
      </header>

      <section className="relative mx-auto mt-20 flex max-w-5xl flex-wrap justify-center gap-14">
        {loading && (
          <div className="flex items-end justify-center gap-12 py-6">
            <Monocular />
            <Compass />
          </div>
        )}
        {!loading && workspaces.length === 0 && (
          <div className="pixel-box max-w-md bg-card/80 p-6 text-center">
            <SeaChart />
            <p className="font-display text-xs text-primary">EMPTY SEAS</p>
            <p className="mt-3 font-mono text-2xl text-muted-foreground">
              No islands yet. Create a workspace pointing at a local folder,
              then spawn agents on it.
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

        {workspaces.map((ws) => (
          <div key={ws.id} className="group/card relative">
            <WorkspaceCard workspace={ws} />
            <button
              type="button"
              title="Delete workspace"
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!confirm(`Delete island "${ws.name}"?`)) return
                await deleteWorkspace(ws.id)
                await refresh()
              }}
              className="pixel-btn absolute -right-2 -top-2 bg-destructive px-2 py-1 text-[8px] text-destructive-foreground opacity-0 transition group-hover/card:opacity-100 focus:opacity-100"
            >
              X
            </button>
          </div>
        ))}
      </section>

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
