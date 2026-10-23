import { useEffect, useRef, useState, type FormEvent } from 'react'
import { composerMode } from '../lib/composer'
import type { Agent } from '../types'

interface AgentComposerProps {
  agent: Agent
  busy: boolean
  error: string | null
  autoFocus?: boolean
  onSubmit: (text: string) => void
}

export function AgentComposer({
  agent,
  busy,
  error,
  autoFocus,
  onSubmit,
}: AgentComposerProps) {
  const mode = composerMode(agent.status)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus, agent.id, mode])

  if (!mode) return null

  function submit(value: string) {
    const next = value.trim()
    if (!next || busy) return
    onSubmit(next)
    setText('')
  }

  function onForm(event: FormEvent) {
    event.preventDefault()
    submit(text)
  }

  const inputId = `speech-${agent.id}`
  const answering = mode === 'answer'

  return (
    <form onSubmit={onForm} className="mt-3">
      <label htmlFor={inputId} className="font-display text-[8px] text-primary">
        {answering ? 'ANSWER FROM THE SHORE' : 'HAND THEM A NOTE'}
      </label>
      <div className="mt-2 flex items-stretch gap-2">
        <input
          id={inputId}
          ref={inputRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={busy}
          maxLength={2000}
          placeholder={answering ? 'What should they hear?' : 'A job, while they are sleeping'}
          className="pixel-box min-w-0 flex-1 bg-card px-3 py-2 font-mono text-2xl text-terminal-foreground outline-none disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="pixel-btn bg-primary px-3 text-primary-foreground disabled:opacity-40"
        >
          {busy ? '...' : answering ? 'REPLY' : 'NOTE'}
        </button>
      </div>
      {answering && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => submit('yes')}
            className="pixel-btn bg-muted px-3 py-2 disabled:opacity-40"
          >
            YES
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => submit('no')}
            className="pixel-btn bg-muted px-3 py-2 disabled:opacity-40"
          >
            NO
          </button>
        </div>
      )}
      {error && <p className="mt-2 font-mono text-xl text-destructive">{error}</p>}
    </form>
  )
}
