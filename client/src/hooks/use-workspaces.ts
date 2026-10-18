import { useCallback, useEffect, useState } from 'react'
import { listWorkspaces, wsUrl } from '../lib/api'
import type { AgentStatus, Workspace } from '../types'

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await listWorkspaces()
      setWorkspaces(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 4000)
    return () => window.clearInterval(id)
  }, [refresh])

  useEffect(() => {
    const socket = new WebSocket(wsUrl('/api/events'))
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as {
          type: string
          agentId: string
          status?: AgentStatus
        }
        if (msg.type === 'status' && msg.status) {
          setWorkspaces((prev) =>
            prev.map((ws) => ({
              ...ws,
              agents: ws.agents.map((agent) =>
                agent.id === msg.agentId
                  ? { ...agent, status: msg.status! }
                  : agent,
              ),
            })),
          )
        }
        if (msg.type === 'exit') {
          setWorkspaces((prev) =>
            prev.map((ws) => ({
              ...ws,
              agents: ws.agents.map((agent) =>
                agent.id === msg.agentId
                  ? { ...agent, status: 'done' }
                  : agent,
              ),
            })),
          )
        }
      } catch {
        // ignore
      }
    }
    return () => socket.close()
  }, [])

  return { workspaces, setWorkspaces, loading, error, refresh }
}
