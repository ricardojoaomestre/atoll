import { jobLine } from '../lib/job-line'
import type { Agent } from '../types'

interface AgentDialogueProps {
  agent: Agent
}

export function AgentDialogue({ agent }: AgentDialogueProps) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-30 w-[min(100%-2rem,48rem)] -translate-x-1/2">
      <div
        role="status"
        aria-live="polite"
        className="pixel-box bg-terminal px-4 py-3"
      >
        <p className="font-display text-[10px] text-primary">{agent.name}</p>
        <p className="mt-2 font-mono text-2xl leading-tight text-terminal-foreground">
          {jobLine(agent)}
        </p>
      </div>
    </div>
  )
}
