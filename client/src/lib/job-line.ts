import type { Agent, AgentStatus } from '../types'

const STATUS_JOB: Record<AgentStatus, string> = {
  idle: 'Sleeping. No job right now.',
  working: 'Working, but the job is not named yet.',
  listening: 'Listening for the next job.',
  done: 'The last job is finished.',
  'needs-question': 'Wondering about a question.',
  'needs-permission': 'Waiting for permission.',
  unknown: 'Herdr is still recognizing this robot.',
}

export function jobLine(
  agent: Pick<Agent, 'summary' | 'source' | 'name' | 'status'>,
) {
  const summary = agent.summary?.trim()
  if (summary) return summary
  if (agent.source === 'task') {
    const name = agent.name.trim()
    if (name) return name
  }
  return STATUS_JOB[agent.status]
}
