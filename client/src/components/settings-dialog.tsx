import { useEffect, useState } from 'react'
import { getSettings, updateSettings, type CliChoice } from '../lib/api'
import type { CliId } from '../types'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [options, setOptions] = useState<CliChoice[]>([])
  const [cli, setCli] = useState<CliId>('cursor')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    void getSettings()
      .then((settings) => {
        if (cancelled) return
        setOptions(settings.options)
        setCli(settings.cli)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load settings')
      })
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) return null

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await updateSettings(cli)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
        className="pixel-box w-full max-w-md bg-card p-5 shadow-[6px_6px_0_var(--color-border)]"
      >
        <h2 id="settings-title" className="font-display text-sm text-primary">
          DEFAULT CLI
        </h2>
        <p className="mt-2 font-mono text-xl text-muted-foreground">
          New agents start with this CLI. One already running keeps the CLI it
          started with.
        </p>

        <div className="mt-5 flex flex-col gap-3" role="radiogroup" aria-label="Default CLI">
          {options.map((option) => {
            const selected = cli === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCli(option.id)}
                className={`pixel-box px-3 py-3 text-left ${
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <span className="font-display text-[8px]">{option.label}</span>
                <span className="mt-2 block font-mono text-xl">
                  {option.command}
                </span>
                <span className="mt-1 block font-mono text-lg opacity-80">
                  {option.available ? option.bin : 'not installed'}
                </span>
              </button>
            )
          })}
        </div>

        {error && (
          <p className="mt-3 font-mono text-xl text-destructive">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="pixel-btn bg-muted px-4 py-3"
          >
            CANCEL
          </button>
          <button
            type="button"
            disabled={busy || options.length === 0}
            onClick={() => void save()}
            className="pixel-btn bg-primary px-4 py-3 text-primary-foreground disabled:opacity-40"
          >
            {busy ? '...' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  )
}
