import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { wsUrl } from '../lib/api'
import { STATUS_CLASS, STATUS_LABEL } from '../lib/status'
import type { Agent } from '../types'

interface AgentTerminalProps {
  workspaceId: string
  agent: Agent
  onClose: () => void
  onSubAgent: () => void
  onDismiss: () => void
}

export function AgentTerminal({
  agent,
  onClose,
  onSubAgent,
  onDismiss,
}: AgentTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: '#0c0a14',
        foreground: '#e8e2ff',
        cursor: '#f8d048',
        selectionBackground: '#3dd6c655',
      },
      allowProposedApi: true,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(el)
    fit.fit()
    term.focus()
    termRef.current = term

    const socket = new WebSocket(wsUrl(`/ws/agents/${agent.id}`))
    socket.binaryType = 'arraybuffer'

    const sendResize = () => {
      fit.fit()
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: 'resize',
            cols: term.cols,
            rows: term.rows,
          }),
        )
      }
    }

    socket.onopen = () => sendResize()
    socket.onmessage = (event) => {
      if (typeof event.data === 'string') {
        term.write(event.data)
      } else {
        term.write(new Uint8Array(event.data as ArrayBuffer))
      }
    }
    socket.onerror = () => {
      term.writeln('\r\n\x1b[31m[websocket error]\x1b[0m')
    }
    socket.onclose = () => {
      term.writeln('\r\n\x1b[90m[disconnected]\x1b[0m')
    }

    const disposable = term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input', data }))
      }
    })

    const onResize = () => sendResize()
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(() => sendResize())
    ro.observe(el)

    return () => {
      disposable.dispose()
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      socket.close()
      term.dispose()
      termRef.current = null
    }
  }, [agent.id])

  return (
    <aside className="pixel-box animate-in fixed inset-x-3 inset-y-3 z-30 flex w-auto flex-col bg-card sm:inset-y-4 sm:right-4 sm:left-auto sm:w-[min(520px,calc(100vw-2rem))]">
      <header className="flex items-center gap-2 border-b-[3px] border-border p-3">
        <span className="font-display text-xs">{agent.name}</span>
        <span
          className={`pixel-box px-2 py-0.5 font-display text-[8px] ${STATUS_CLASS[agent.status]}`}
        >
          {STATUS_LABEL[agent.status]}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="pixel-btn ml-auto bg-destructive px-2 py-1 text-destructive-foreground"
        >
          X
        </button>
      </header>

      <div ref={containerRef} className="min-h-0 flex-1 bg-terminal p-1" />

      <footer className="flex gap-2 border-t-[3px] border-border p-3">
        <button
          type="button"
          onClick={onSubAgent}
          className="pixel-btn flex-1 bg-secondary px-2 py-2 text-secondary-foreground"
        >
          + SUB-AGENT
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="pixel-btn bg-muted px-2 py-2"
        >
          DISMISS
        </button>
      </footer>
    </aside>
  )
}
