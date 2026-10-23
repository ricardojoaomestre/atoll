import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { getSettings } from '../lib/api'

interface SpawnAgentDialogProps {
  open: boolean
  onClose: () => void
  onSpawn: (task: string, kind: string) => Promise<void>
}

export function SpawnAgentDialog({ open, onClose, onSpawn }: SpawnAgentDialogProps) {
  const [task, setTask] = useState('')
  const [kind, setKind] = useState('cursor')
  const [kinds, setKinds] = useState<string[]>(['cursor'])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getSettings()
      .then((settings) => {
        if (cancelled) return
        setKind(settings.cli)
        const reported = settings.options.map((option) => option.id)
        setKinds(reported.length > 0 ? reported : [settings.cli])
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) return null

  function close() {
    if (busy) return
    setError(null)
    onClose()
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      close()
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const text = task.trim()
    if (!text) {
      setError('Write the task first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSpawn(text, kind)
      setTask('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spawn failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={close}
      onKeyDown={onKeyDown}
    >
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="pixel-box w-full max-w-md bg-card p-5 shadow-[6px_6px_0_var(--color-border)]"
      >
        <h2 className="font-display text-sm text-primary">SEND AN AGENT</h2>
        <p className="mt-2 font-mono text-xl text-muted-foreground">
          Herdr starts this client on the island and hands them the task.
        </p>
        <label className="mt-5 block font-display text-[8px] text-muted-foreground">
          CLIENT
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className="pixel-box mt-2 w-full bg-terminal px-3 py-2 font-mono text-2xl text-terminal-foreground outline-none"
          >
            {kinds.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-5 block font-display text-[8px] text-muted-foreground">
          TASK
          <textarea
            autoFocus
            value={task}
            onChange={(event) => setTask(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            className="pixel-box mt-2 min-h-28 w-full resize-y bg-terminal px-3 py-2 font-mono text-2xl text-terminal-foreground outline-none"
            placeholder="What should they do?"
            required
          />
        </label>
        {error && (
          <p className="mt-3 font-mono text-xl text-destructive">{error}</p>
        )}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={close}
            className="pixel-btn flex-1 bg-muted px-3 py-3"
            disabled={busy}
          >
            CANCEL
          </button>
          <button
            type="submit"
            className="pixel-btn flex-1 bg-primary px-3 py-3 text-primary-foreground"
            disabled={busy || !task.trim()}
          >
            {busy ? 'STARTING' : 'SEND'}
          </button>
        </div>
      </form>
    </div>
  )
}
