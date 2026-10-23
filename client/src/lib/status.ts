import type { AgentStatus } from '../types'

export const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: 'SLEEPING',
  working: 'WORKING',
  listening: 'LISTENING',
  done: 'TASK DONE',
  'needs-question': 'WONDERING',
  'needs-permission': 'MAY I?',
  unknown: 'SETTLING',
}

export const STATUS_CLASS: Record<AgentStatus, string> = {
  idle: 'bg-muted',
  working: 'bg-secondary text-secondary-foreground',
  listening: 'bg-primary text-primary-foreground',
  done: 'bg-success text-primary-foreground',
  'needs-question': 'bg-warning text-primary-foreground',
  'needs-permission': 'bg-warning text-primary-foreground',
  unknown: 'bg-muted text-muted-foreground',
}

export function countByStatus(
  agents: { status: AgentStatus }[],
  status: AgentStatus,
) {
  return agents.filter((a) => a.status === status).length
}

export function countNeedsAttention(agents: { status: AgentStatus }[]) {
  return agents.filter(
    (a) => a.status === 'needs-question' || a.status === 'needs-permission',
  ).length
}
