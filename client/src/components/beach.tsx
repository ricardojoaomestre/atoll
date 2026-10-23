import { beachSpots, crateLabel } from '../lib/beach'
import type { Agent } from '../types'
import { AgentSprite } from './agent-sprite'
import { Island } from './island'

interface BeachProps {
  hue: number
  trees: number
  camp: boolean
  agents: Agent[]
  childrenOf: (id: string) => Agent[]
  selectedId: string | null
  onOpen: (agent: Agent) => void
  onEnter: (id: string) => void
  onLeave: () => void
}

export function Beach({
  hue,
  trees,
  camp,
  agents,
  childrenOf,
  selectedId,
  onOpen,
  onEnter,
  onLeave,
}: BeachProps) {
  const spots = beachSpots(agents)

  return (
    <div role="region" aria-label="Beach" className="relative h-80 w-full">
      <div className="absolute inset-x-2 bottom-24 z-10 flex flex-wrap items-end justify-center gap-x-3 gap-y-2 sm:contents">
        {agents.map((agent) => {
          const spot = spots.get(agent.id)
          if (!spot) return null
          const crate = agent.status === 'working' ? crateLabel(agent.summary) : ''
          return (
            <div
              key={agent.id}
              className="relative z-10 flex items-end sm:absolute sm:-translate-x-1/2 sm:left-[var(--beach-left)] sm:bottom-[var(--beach-bottom)]"
              style={{
                ['--beach-left' as string]: `${spot.left}%`,
                ['--beach-bottom' as string]: `${spot.bottom}px`,
              }}
            >
              {spot.shore && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-2 left-1/2 h-1 w-10 -translate-x-1/2 animate-drift bg-white/80"
                />
              )}
              <AgentSprite
                agent={agent}
                pace={spot.pace}
                paceDelay={spot.delay}
                crate={crate || undefined}
                selected={selectedId === agent.id}
                onClick={() => onOpen(agent)}
                onMouseEnter={() => onEnter(agent.id)}
                onMouseLeave={onLeave}
                onFocus={() => onEnter(agent.id)}
                onBlur={onLeave}
              />
              {childrenOf(agent.id).map((child) => (
                <AgentSprite
                  key={child.id}
                  small
                  ghost={child.source === 'task'}
                  agent={child}
                  selected={selectedId === child.id}
                  onClick={child.source === 'task' ? undefined : () => onOpen(child)}
                  onMouseEnter={() => onEnter(child.id)}
                  onMouseLeave={onLeave}
                  onFocus={() => onEnter(child.id)}
                  onBlur={onLeave}
                />
              ))}
            </div>
          )
        })}
      </div>
      <div className="absolute inset-x-0 bottom-0">
        <Island hue={hue} wide trees={trees} camp={camp} />
      </div>
    </div>
  )
}
