import type { AgentStatus } from '../types'

export type ComposerMode = 'note' | 'answer'

export function composerMode(status: AgentStatus): ComposerMode | null {
  if (status === 'idle' || status === 'done') return 'note'
  if (status === 'needs-question' || status === 'needs-permission') return 'answer'
  return null
}
