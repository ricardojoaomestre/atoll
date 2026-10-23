import { formatLogTime, type ShipLogEntry } from '../lib/ship-log'

interface ShipLogProps {
  entries: ShipLogEntry[]
  onOpen: (entry: ShipLogEntry) => void
}

export function ShipLog({ entries, onOpen }: ShipLogProps) {
  const lines = entries.slice(0, 6)

  return (
    <section
      aria-label="Ship's log"
      className="pixel-box fixed inset-x-3 bottom-3 z-20 max-h-44 overflow-auto bg-card/95 px-4 py-3 sm:inset-x-6"
    >
      <h2 className="font-display text-[10px] text-primary">SHIP'S LOG</h2>
      {lines.length === 0 ? (
        <p className="mt-2 font-mono text-2xl text-muted-foreground">
          Blank pages. The crew writes here when they stand up, lie down, or walk into the surf.
        </p>
      ) : (
        <ol className="mt-2 space-y-1">
          {lines.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onOpen(entry)}
                className="flex w-full items-baseline gap-3 text-left font-mono text-2xl leading-tight text-terminal-foreground hover:text-primary"
              >
                <span className="shrink-0 text-primary">{formatLogTime(entry.at)}</span>
                <span>{entry.text}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
