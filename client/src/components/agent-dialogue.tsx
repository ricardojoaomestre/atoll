import { jobLine } from '../lib/job-line'
import type { Agent } from '../types'
import { AgentComposer } from './agent-composer'

interface AgentDialogueProps {
  agent: Agent
  busy: boolean
  error: string | null
  autoFocus?: boolean
  onSubmit: (text: string) => void
  onClose: () => void
  onPointerEnter: () => void
  onPointerLeave: () => void
}

export function AgentDialogue({
  agent,
  busy,
  error,
  autoFocus,
  onSubmit,
  onClose,
  onPointerEnter,
  onPointerLeave,
}: AgentDialogueProps) {
  return (
    <div
      className="fixed bottom-4 left-1/2 z-30 w-[min(100%-2rem,48rem)] -translate-x-1/2"
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
    >
      <div role="status" aria-live="polite" className="pixel-box bg-terminal px-4 py-3">
        <div className="flex items-start gap-2">
          <p className="font-display text-[10px] text-primary">
            {agent.name}
            {agent.kind && agent.kind !== agent.name ? ` · ${agent.kind}` : ''}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="pixel-btn ml-auto bg-muted px-2 py-1"
            title="Put the dialogue away"
          >
            X
          </button>
        </div>
        <p className="mt-2 font-mono text-2xl leading-tight text-terminal-foreground">
          {jobLine(agent)}
        </p>
        <AgentComposer
          agent={agent}
          busy={busy}
          error={error}
          autoFocus={autoFocus}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  )
}
