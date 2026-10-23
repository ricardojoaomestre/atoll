import { useEffect, useState } from 'react'
import { getSettings, updateSettings, type CliChoice } from '../lib/api'
import { parseSkyChoice, setSkyChoice, type SkyChoice } from '../lib/time-of-day'
import type { CliId } from '../types'

const skies: { id: SkyChoice; label: string; detail: string }[] = [
  { id: 'auto', label: 'AUTOMATIC', detail: 'Follows the time of day' },
  { id: 'sunrise', label: 'SUNRISE', detail: 'Indigo fading into amber' },
  { id: 'day', label: 'SUNNY DAY', detail: 'Deep blue fading into sky' },
  { id: 'sunset', label: 'SUNSET', detail: 'Purple fading into orange' },
  { id: 'night', label: 'NIGHT', detail: 'Dark sky and stars' },
]

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [options, setOptions] = useState<CliChoice[]>([])
  const [cli, setCli] = useState<CliId>('cursor')
  const [sky, setSky] = useState<SkyChoice>('auto')
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
        setSky(parseSkyChoice(settings.sky))
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
      const saved = await updateSettings({ cli, sky })
      setSkyChoice(parseSkyChoice(saved.sky))
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
        className="pixel-box max-h-[90vh] w-full max-w-md overflow-y-auto bg-card p-5 shadow-[6px_6px_0_var(--color-border)]"
      >
        <h2 id="settings-title" className="font-display text-sm text-primary">
          SETTINGS
        </h2>
        <p className="mt-4 font-display text-[8px] text-primary">DEFAULT KIND</p>
        <p className="mt-2 font-mono text-xl text-muted-foreground">
          New robots start as this Herdr agent. One already on an island keeps
          the kind Herdr detected.
        </p>

        <div className="mt-5 flex flex-col gap-3" role="radiogroup" aria-label="Default agent kind">
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

        <p className="mt-5 font-display text-[8px] text-primary">BACKGROUND</p>
        <div className="mt-3 flex flex-col gap-2" role="radiogroup" aria-label="Background">
          {skies.map((option) => {
            const selected = sky === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSky(option.id)}
                className={`pixel-box px-3 py-2 text-left ${
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <span className="font-display text-[8px]">{option.label}</span>
                <span className="mt-1 block font-mono text-lg opacity-80">
                  {option.detail}
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
