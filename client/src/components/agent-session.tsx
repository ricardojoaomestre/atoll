import { useEffect } from 'react'
import { jobLine } from '../lib/job-line'
import { STATUS_CLASS, STATUS_LABEL } from '../lib/status'
import type { Agent } from '../types'
import { AgentComposer } from './agent-composer'

interface AgentSessionProps {
  agent: Agent
  busy: boolean
  error: string | null
  result: string | null
  resultPending: boolean
  onHide: () => void
  onAnother: () => void
  onDismiss: () => void
  onSpeak: (text: string) => void
}

export function AgentSession({
  agent,
  busy,
  error,
  result,
  resultPending,
  onHide,
  onAnother,
  onDismiss,
  onSpeak,
}: AgentSessionProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onHide()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onHide])

  return (
    <aside className="pixel-box absolute inset-0 z-10 flex flex-col bg-card">
      <header className="flex items-center gap-2 border-b-[3px] border-border p-3">
        <span className="font-display text-xs">{agent.name}</span>
        <span
          className={`pixel-box px-2 py-0.5 font-display text-[8px] ${STATUS_CLASS[agent.status]}`}
        >
          {STATUS_LABEL[agent.status]}
        </span>
        <button
          type="button"
          onClick={onHide}
          className="pixel-btn ml-auto bg-muted px-2 py-1"
          title="Hide this card. The Herdr session keeps running."
        >
          HIDE
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 overflow-auto bg-terminal p-6">
        <div>
          <p className="font-display text-[8px] text-primary">LAST RESULT</p>
          <p className="mt-2 font-mono text-3xl leading-tight text-terminal-foreground">
            {resultPending
              ? 'Reading the last result…'
              : result || 'No finished result yet.'}
          </p>
        </div>
        <AgentComposer agent={agent} busy={busy} error={error} onSubmit={onSpeak} />
        <div className="font-mono text-2xl text-muted-foreground">
          {agent.kind && (
            <p>
              <span className="font-display text-[8px] text-primary">KIND </span>
              {agent.kind}
            </p>
          )}
          <p className="mt-2">
            <span className="font-display text-[8px] text-primary">JOB </span>
            {jobLine(agent)}
          </p>
          {agent.cwd && (
            <p className="mt-2 break-all">
              <span className="font-display text-[8px] text-primary">FOLDER </span>
              {agent.cwd}
            </p>
          )}
          {agent.tabLabel && (
            <p className="mt-2">
              <span className="font-display text-[8px] text-primary">DOCK </span>
              {agent.tabLabel}
            </p>
          )}
        </div>
        <p className="max-w-xl font-mono text-2xl leading-tight text-muted-foreground">
          This robot is a Herdr pane. Opening it focused that pane, and the
          terminal stays there.
        </p>
      </div>

      <footer className="flex gap-2 border-t-[3px] border-border p-3">
        <button
          type="button"
          disabled={busy}
          onClick={onAnother}
          className="pixel-btn flex-1 bg-secondary px-2 py-2 text-secondary-foreground disabled:opacity-40"
        >
          + ANOTHER
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDismiss}
          className="pixel-btn bg-destructive px-2 py-2 text-destructive-foreground disabled:opacity-40"
        >
          DISMISS
        </button>
      </footer>
    </aside>
  )
}
