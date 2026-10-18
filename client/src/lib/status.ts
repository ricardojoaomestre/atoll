import type { AgentStatus } from '../types'

export const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: 'IDLE',
  working: 'WORKING',
  done: 'TASK DONE',
  'needs-input': 'NEEDS YOU',
}

export const STATUS_CLASS: Record<AgentStatus, string> = {
  idle: 'bg-muted',
  working: 'bg-secondary text-secondary-foreground',
  done: 'bg-success text-primary-foreground',
  'needs-input': 'bg-warning text-primary-foreground',
}

export function countByStatus(
  agents: { status: AgentStatus }[],
  status: AgentStatus,
) {
  return agents.filter((a) => a.status === status).length
}
