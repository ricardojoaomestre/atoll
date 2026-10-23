import type { AgentStatus } from '../types.js'

export interface ShipLogEntry {
  id: string
  at: string
  workspaceId: string
  agentId: string
  text: string
}

interface LogAgent {
  id: string
  name: string
  status: AgentStatus
  summary?: string
}

interface LogIsland {
  id: string
  name: string
  agents: LogAgent[]
}

const VOICE: Record<AgentStatus, string> = {
  idle: 'lay down',
  working: 'picked up a crate',
  listening: 'turned an ear',
  done: 'held up a check',
  'needs-question': 'stood in the surf',
  'needs-permission': 'stood in the surf',
  unknown: 'is still settling',
}

function jobOf(summary: string | undefined) {
  const job = summary?.trim().replace(/\s+/g, ' ')
  if (!job) return ''
  const short = job.length > 72 ? `${job.slice(0, 71)}…` : job
  return ` · ${short}`
}

function lineFor(agent: LogAgent, island: string) {
  return `${agent.name} ${VOICE[agent.status]} on ${island}${jobOf(agent.summary)}`
}

export function diffShipLog(
  previous: LogIsland[] | null,
  next: LogIsland[],
  at: string,
): ShipLogEntry[] {
  if (!previous) return []
  const before = new Map<string, LogAgent>()
  for (const island of previous) {
    for (const agent of island.agents) before.set(agent.id, agent)
  }

  const entries: ShipLogEntry[] = []
  const seen = new Set<string>()
  for (const island of next) {
    for (const agent of island.agents) {
      seen.add(agent.id)
      const prior = before.get(agent.id)
      if (!prior) {
        entries.push({
          id: `${at}:${agent.id}:ashore`,
          at,
          workspaceId: island.id,
          agentId: agent.id,
          text: `${agent.name} came ashore on ${island.name}`,
        })
        continue
      }
      if (prior.status !== agent.status) {
        entries.push({
          id: `${at}:${agent.id}:${agent.status}`,
          at,
          workspaceId: island.id,
          agentId: agent.id,
          text: lineFor(agent, island.name),
        })
      }
    }
  }

  for (const island of previous) {
    for (const agent of island.agents) {
      if (seen.has(agent.id)) continue
      entries.push({
        id: `${at}:${agent.id}:sea`,
        at,
        workspaceId: island.id,
        agentId: agent.id,
        text: `${agent.name} walked into the sea`,
      })
    }
  }

  return entries
}
