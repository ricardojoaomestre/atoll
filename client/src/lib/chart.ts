import type { AgentStatus } from '../types'

export type ChartBand = 'wave' | 'flag' | 'work' | 'horizon'

export const CHART_SCALE: Record<ChartBand, number> = {
  wave: 1.06,
  flag: 1,
  work: 0.94,
  horizon: 0.82,
}

function needsYou(status: AgentStatus) {
  return status === 'needs-question' || status === 'needs-permission'
}

export function chartBand(agents: { status: AgentStatus }[]): ChartBand {
  if (agents.some((agent) => needsYou(agent.status))) return 'wave'
  if (agents.some((agent) => agent.status === 'done')) return 'flag'
  if (agents.some((agent) => agent.status === 'working' || agent.status === 'listening')) {
    return 'work'
  }
  return 'horizon'
}

export function nextWave<T extends { id: string; agents: { id: string; status: AgentStatus }[] }>(
  workspaces: T[],
) {
  for (const workspace of workspaces) {
    const agent = workspace.agents.find((item) => needsYou(item.status))
    if (agent) return { workspaceId: workspace.id, agentId: agent.id }
  }
  return null
}

export function nextMate(
  agents: { id: string; status: AgentStatus }[],
  currentId: string | null,
) {
  const waves = agents.filter((agent) => needsYou(agent.status))
  if (waves.length === 0) return null
  const index = waves.findIndex((agent) => agent.id === currentId)
  return waves[(index + 1) % waves.length].id
}
