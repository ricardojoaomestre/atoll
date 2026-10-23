import { describe, expect, it } from 'vitest'
import { jobLine } from './job-line'
import { makeAgent } from '../test/fixtures'
import type { AgentStatus } from '../types'

const fallbacks: [AgentStatus, string][] = [
  ['idle', 'Sleeping. No job right now.'],
  ['working', 'Working, but the job is not named yet.'],
  ['listening', 'Listening for the next job.'],
  ['done', 'The last job is finished.'],
  ['needs-question', 'Wondering about a question.'],
  ['needs-permission', 'Waiting for permission.'],
  ['unknown', 'Herdr is still recognizing this robot.'],
]

describe('jobLine', () => {
  it('uses the summary when the agent has one', () => {
    expect(
      jobLine(makeAgent({ summary: 'Refactor auth middleware' })),
    ).toBe('Refactor auth middleware')
  })

  it('prefers the summary over a task name', () => {
    expect(
      jobLine(
        makeAgent({
          source: 'task',
          name: 'Explore',
          summary: 'Read the router',
        }),
      ),
    ).toBe('Read the router')
  })

  it('uses the detected name for a task child without a summary', () => {
    expect(jobLine(makeAgent({ source: 'task', name: 'Explore' }))).toBe(
      'Explore',
    )
  })

  it('ignores a blank summary', () => {
    expect(jobLine(makeAgent({ summary: '   ', status: 'idle' }))).toBe(
      'Sleeping. No job right now.',
    )
  })

  it.each(fallbacks)('falls back for %s', (status, line) => {
    expect(jobLine(makeAgent({ status }))).toBe(line)
  })
})
