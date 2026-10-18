import type { AgentStatus } from '../types'

export const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: 'IDLE',
  working: 'WORKING',
  listening: 'LISTENING',
  done: 'TASK DONE',
  'needs-input': 'ASKING',
}

export const STATUS_CLASS: Record<AgentStatus, string> = {
  idle: 'bg-muted',
  working: 'bg-secondary text-secondary-foreground',
  listening: 'bg-primary text-primary-foreground',
  done: 'bg-success text-primary-foreground',
  'needs-input': 'bg-warning text-primary-foreground',
}

export function countByStatus(
  agents: { status: AgentStatus }[],
  status: AgentStatus,
) {
  return agents.filter((a) => a.status === status).length
}
