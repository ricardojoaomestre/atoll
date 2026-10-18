import { useCallback, useEffect, useState } from 'react'
import { listWorkspaces } from '../lib/api'
import { subscribeAgentEvents } from '../lib/events'
import type { Workspace } from '../types'

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
  }, [refresh])

  useEffect(() => {
    return subscribeAgentEvents({
      onReconnect: () => {
        void refresh()
      },
      onEvent: (msg) => {
        if (msg.type === 'status' && msg.status) {
          const status = msg.status
          setWorkspaces((prev) =>
            prev.map((ws) => ({
              ...ws,
              agents: ws.agents.map((agent) =>
                agent.id === msg.agentId ? { ...agent, status } : agent,
              ),
            })),
          )
        }
        if (msg.type === 'exit') {
          setWorkspaces((prev) =>
            prev.map((ws) => ({
              ...ws,
              agents: ws.agents.map((agent) =>
                agent.id === msg.agentId ? { ...agent, status: 'done' } : agent,
              ),
            })),
          )
        }
      },
    })
  }, [refresh])

  return { workspaces, setWorkspaces, loading, error, refresh }
}
