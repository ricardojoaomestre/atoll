import type { Agent } from '../types'

interface AgentSpriteProps {
  agent: Agent
  small?: boolean
  selected?: boolean
  onClick?: () => void
}

export function AgentSprite({
  agent,
  small,
  selected,
  onClick,
}: AgentSpriteProps) {
  const fill = `oklch(0.72 0.17 ${agent.color})`
  const shade = `oklch(0.45 0.14 ${agent.color})`
  const status = agent.status

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center focus:outline-none"
      style={{
        transform: `scale(${small ? 0.7 : 1})`,
        transformOrigin: 'bottom',
      }}
    >
      <div className="absolute -top-12 h-10">
        {status === 'needs-input' && (
          <div className="pixel-box animate-pop bg-warning px-2 py-1 font-display text-xs text-primary-foreground">
            <span className="animate-blink">!</span>
          </div>
        )}
        {status === 'done' && (
          <div className="pixel-box animate-pop bg-success px-2 py-1 font-display text-xs text-primary-foreground">
            ★
          </div>
        )}
        {status === 'working' && (
          <div className="flex gap-1 pt-4">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-puff rounded-full bg-muted-foreground"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className={
          status === 'working'
            ? 'animate-bob'
            : status === 'done'
              ? 'animate-jump'
              : ''
        }
      >
        <svg
          width="64"
          height="72"
          viewBox="0 0 16 18"
          shapeRendering="crispEdges"
          className={selected ? 'drop-shadow-[0_0_6px_var(--color-primary)]' : ''}
        >
          <rect
            x="7"
            y="0"
            width="2"
            height="2"
            fill={status === 'needs-input' ? 'var(--color-warning)' : 'var(--color-primary)'}
          />
          <rect x="7.5" y="2" width="1" height="2" fill="var(--color-border)" />
          <rect
            x="3"
            y="4"
            width="10"
            height="9"
            fill={fill}
            stroke="var(--color-border)"
            strokeWidth="0.5"
          />
          <rect x="3" y="11" width="10" height="2" fill={shade} />
          {status === 'done' ? (
            <>
              <path
                d="M5 8 L6 7 L7 8"
                stroke="var(--color-border)"
                strokeWidth="0.7"
                fill="none"
              />
              <path
                d="M9 8 L10 7 L11 8"
                stroke="var(--color-border)"
                strokeWidth="0.7"
                fill="none"
              />
            </>
          ) : status === 'needs-input' ? (
            <>
              <rect x="5" y="6" width="2" height="3" fill="var(--color-border)" />
              <rect x="9" y="6" width="2" height="3" fill="var(--color-border)" />
            </>
          ) : (
            <>
              <rect x="5" y="7" width="2" height="2" fill="var(--color-border)" />
              <rect x="9" y="7" width="2" height="2" fill="var(--color-border)" />
            </>
          )}
          {status === 'needs-input' ? (
            <rect x="7" y="10" width="2" height="1" fill="var(--color-border)" />
          ) : (
            <rect x="6" y="10" width="4" height="1" fill="var(--color-border)" />
          )}
          <g
            className={
              status === 'working'
                ? 'animate-typing'
                : status === 'needs-input'
                  ? 'animate-wave'
                  : ''
            }
            style={{ transformOrigin: '13px 8px', transformBox: 'view-box' }}
          >
            <rect x="13" y="8" width="2" height="3" fill={shade} />
          </g>
          <g
            className={status === 'working' ? 'animate-typing' : ''}
            style={{
              transformOrigin: '3px 8px',
              transformBox: 'view-box',
              animationDelay: '0.09s',
            }}
          >
            <rect x="1" y="8" width="2" height="3" fill={shade} />
          </g>
          <rect x="5" y="13" width="2" height="3" fill={shade} />
          <rect x="9" y="13" width="2" height="3" fill={shade} />
          {status === 'working' && (
            <>
              <rect x="2" y="14" width="12" height="1" fill="var(--color-muted-foreground)" />
              <rect x="4" y="12" width="8" height="2" fill="var(--color-secondary)" />
            </>
          )}
        </svg>
      </div>

      <div className="pixel-box mt-1 bg-card px-2 py-0.5 font-display text-[8px] text-card-foreground group-hover:bg-primary group-hover:text-primary-foreground">
        {agent.name}
      </div>
    </button>
  )
}
