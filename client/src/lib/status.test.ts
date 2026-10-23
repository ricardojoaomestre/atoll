import { describe, expect, it } from 'vitest'
import {
  STATUS_CLASS,
  STATUS_LABEL,
  countByStatus,
  countNeedsAttention,
} from './status'
import type { AgentStatus } from '../types'

const statuses: AgentStatus[] = [
  'idle',
  'working',
  'listening',
  'done',
  'needs-question',
  'needs-permission',
  'unknown',
]

describe('status labels and classes', () => {
  it('covers every agent status', () => {
    for (const status of statuses) {
      expect(STATUS_LABEL[status]).toBeTruthy()
      expect(STATUS_CLASS[status]).toBeTruthy()
    }
  })
})

describe('countByStatus', () => {
  it('counts matching agents', () => {
    const agents = [
      { status: 'working' as const },
      { status: 'working' as const },
      { status: 'idle' as const },
    ]
    expect(countByStatus(agents, 'working')).toBe(2)
    expect(countByStatus(agents, 'idle')).toBe(1)
  })
})

describe('countNeedsAttention', () => {
  it('includes question and permission states', () => {
    const agents = [
      { status: 'needs-question' as const },
      { status: 'needs-permission' as const },
      { status: 'working' as const },
    ]
    expect(countNeedsAttention(agents)).toBe(2)
  })
})
