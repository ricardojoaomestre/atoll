import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { wsUrl } from '../lib/api'
import { STATUS_CLASS, STATUS_LABEL } from '../lib/status'
import type { Agent } from '../types'

interface AgentTerminalProps {
  agent: Agent
  visible: boolean
  onClose: () => void
  onSubAgent: (agent: Agent) => void
  onDismiss: (agent: Agent) => void
}

export function AgentTerminal({
  agent,
  visible,
  onClose,
  onSubAgent,
  onDismiss,
}: AgentTerminalProps) {
  const panelRef = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const visibleRef = useRef(visible)
  visibleRef.current = visible

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      cursorInactiveStyle: 'block',
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      scrollback: 400,
      theme: {
        background: '#0c0a14',
        foreground: '#e8e2ff',
        cursor: '#f8d048',
        cursorAccent: '#1a1020',
        selectionBackground: '#3dd6c655',
      },
      allowProposedApi: true,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(el)
    fit.fit()
    termRef.current = term
    fitRef.current = fit

    const socket = new WebSocket(wsUrl(`/ws/agents/${agent.id}`))
    socket.binaryType = 'arraybuffer'
    socketRef.current = socket

    let pending = ''
    const pendingBin: Uint8Array[] = []
    let flushId = 0

    const flushWrites = () => {
      flushId = 0
      if (pending) {
        term.write(pending)
        pending = ''
      }
      while (pendingBin.length > 0) {
        term.write(pendingBin.shift()!)
      }
    }

    const enqueueWrite = (chunk: string | Uint8Array) => {
      if (typeof chunk === 'string') pending += chunk
      else pendingBin.push(chunk)
      if (!flushId) flushId = window.requestAnimationFrame(flushWrites)
    }

    const sendResize = () => {
      if (!visibleRef.current) return
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
        enqueueWrite(event.data)
      } else {
        enqueueWrite(new Uint8Array(event.data as ArrayBuffer))
      }
    }
    socket.onerror = () => {
      enqueueWrite('\r\n\x1b[31m[websocket error]\x1b[0m')
    }
    socket.onclose = () => {
      enqueueWrite('\r\n\x1b[90m[disconnected]\x1b[0m')
    }

    const disposable = term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input', data }))
      }
    })

    const onResize = () => sendResize()
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(() => sendResize())
    resizeObserverRef.current = ro
    if (visibleRef.current) ro.observe(el)

    return () => {
      if (flushId) window.cancelAnimationFrame(flushId)
      disposable.dispose()
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      resizeObserverRef.current = null
      socket.close()
      term.dispose()
      termRef.current = null
      fitRef.current = null
      socketRef.current = null
    }
  }, [agent.id])

  useEffect(() => {
    const el = containerRef.current
    const ro = resizeObserverRef.current
    if (el && ro) {
      ro.disconnect()
      if (visible) ro.observe(el)
    }

    if (!visible) return
    const term = termRef.current
    const fit = fitRef.current
    const socket = socketRef.current
    if (!term || !fit) return

    const id = window.requestAnimationFrame(() => {
      fit.fit()
      term.focus()
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: 'resize',
            cols: term.cols,
            rows: term.rows,
          }),
        )
      }
    })
    return () => window.cancelAnimationFrame(id)
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [visible, onClose])

  return (
    <aside
      ref={panelRef}
      data-agent-terminal
      hidden={!visible}
      inert={!visible}
      className={`pixel-box absolute inset-0 flex flex-col bg-card ${
        visible ? 'z-10' : 'pointer-events-none z-0'
      }`}
      aria-hidden={!visible}
    >
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
          className="pixel-btn ml-auto bg-muted px-2 py-1"
          title="Hide terminal (keeps session)"
        >
          HIDE
        </button>
      </header>

      <div ref={containerRef} className="min-h-0 flex-1 bg-terminal p-1" />

      <footer className="flex gap-2 border-t-[3px] border-border p-3">
        <button
          type="button"
          onClick={() => onSubAgent(agent)}
          className="pixel-btn flex-1 bg-secondary px-2 py-2 text-secondary-foreground"
        >
          + SUB-AGENT
        </button>
        <button
          type="button"
          onClick={() => onDismiss(agent)}
          className="pixel-btn bg-destructive px-2 py-2 text-destructive-foreground"
        >
          DISMISS
        </button>
      </footer>
    </aside>
  )
}
