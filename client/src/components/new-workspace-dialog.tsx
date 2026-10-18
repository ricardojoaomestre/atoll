import { useState, type FormEvent } from 'react'

interface NewWorkspaceDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string, path: string) => Promise<void>
}

export function NewWorkspaceDialog({
  open,
  onClose,
  onCreate,
}: NewWorkspaceDialogProps) {
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onCreate(name.trim(), path.trim())
      setName('')
      setPath('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="pixel-box w-full max-w-md bg-card p-5 shadow-[6px_6px_0_var(--color-border)]"
      >
        <h2 className="font-display text-sm text-primary">NEW WORKSPACE</h2>
        <p className="mt-2 font-mono text-xl text-muted-foreground">
          Point an island at a local project folder.
        </p>

        <label className="mt-5 block font-display text-[8px] text-muted-foreground">
          NAME
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pixel-box mt-2 w-full bg-terminal px-3 py-2 font-mono text-2xl text-terminal-foreground outline-none"
            placeholder="web-shop"
            required
          />
        </label>

        <label className="mt-4 block font-display text-[8px] text-muted-foreground">
          PATH
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="pixel-box mt-2 w-full bg-terminal px-3 py-2 font-mono text-2xl text-terminal-foreground outline-none"
            placeholder="~/code/web-shop"
            required
          />
        </label>

        {error && (
          <p className="mt-3 font-mono text-xl text-destructive">{error}</p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="pixel-btn flex-1 bg-muted px-3 py-3"
            disabled={busy}
          >
            CANCEL
          </button>
          <button
            type="submit"
            className="pixel-btn flex-1 bg-primary px-3 py-3 text-primary-foreground"
            disabled={busy}
          >
            {busy ? '...' : 'CREATE'}
          </button>
        </div>
      </form>
    </div>
  )
}
