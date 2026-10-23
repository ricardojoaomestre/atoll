import type { AgentStatus } from '../types.js'

const MAX_SPEECH = 2000

export function readSpeech(value: unknown) {
  if (typeof value !== 'string') return null
  const text = value.replace(/\r\n/g, '\n').trim()
  if (!text || text.length > MAX_SPEECH) return null
  return text
}

export function canTakeNote(status: AgentStatus) {
  return status === 'idle' || status === 'done'
}

export function canAnswer(status: AgentStatus) {
  return status === 'needs-question' || status === 'needs-permission'
}
