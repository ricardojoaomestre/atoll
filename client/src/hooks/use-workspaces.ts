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
        if (msg.type === 'spawn' && msg.agent) {
          const spawned = msg.agent
          setWorkspaces((prev) =>
            prev.map((ws) => {
              if (ws.id !== spawned.workspaceId) return ws
              if (ws.agents.some((agent) => agent.id === spawned.id)) return ws
              return { ...ws, agents: [...ws.agents, spawned] }
            }),
          )
        }
        if (msg.type === 'summary' && msg.agentId && msg.summary) {
          const summary = msg.summary
          setWorkspaces((prev) =>
            prev.map((ws) => ({
              ...ws,
              agents: ws.agents.map((agent) =>
                agent.id === msg.agentId ? { ...agent, summary } : agent,
              ),
            })),
          )
        }
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
        if (msg.type === 'remove' && msg.agentId) {
          const agentId = msg.agentId
          setWorkspaces((prev) =>
            prev.map((ws) => ({
              ...ws,
              agents: ws.agents.filter(
                (agent) => agent.id !== agentId && agent.parentId !== agentId,
              ),
            })),
          )
        }
      },
    })
  }, [refresh])

  return { workspaces, setWorkspaces, loading, error, refresh }
}
