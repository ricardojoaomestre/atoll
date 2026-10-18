import { wsUrl } from './api'
import type { AgentStatus } from '../types'

export type AgentEvent = {
  type: string
  agentId: string
  status?: AgentStatus
}

const RETRY_MS = 1_500

export function subscribeAgentEvents(options: {
  onEvent: (msg: AgentEvent) => void
  onReconnect?: () => void
}) {
  let disposed = false
  let socket: WebSocket | null = null
  let retry: number | undefined
  let openedOnce = false

  const connect = () => {
    if (disposed) return
    const next = new WebSocket(wsUrl('/api/events'))
    socket = next

    next.onmessage = (event) => {
      try {
        options.onEvent(JSON.parse(String(event.data)) as AgentEvent)
      } catch {
        // ignore
      }
    }

    next.onopen = () => {
      if (openedOnce) options.onReconnect?.()
      openedOnce = true
    }

    next.onclose = () => {
      if (disposed) return
      retry = window.setTimeout(connect, RETRY_MS)
    }
  }

  connect()

  return () => {
    disposed = true
    if (retry !== undefined) window.clearTimeout(retry)
    socket?.close()
  }
}
