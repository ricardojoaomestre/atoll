import { describe, expect, it } from 'vitest'
import { chartBand, nextMate, nextWave } from './chart'

describe('chartBand', () => {
  it('pulls wondering islands in front of finished and sleeping ones', () => {
    expect(chartBand([{ status: 'needs-question' }, { status: 'done' }])).toBe('wave')
    expect(chartBand([{ status: 'done' }])).toBe('flag')
    expect(chartBand([{ status: 'working' }])).toBe('work')
    expect(chartBand([{ status: 'idle' }])).toBe('horizon')
    expect(chartBand([])).toBe('horizon')
  })
})

describe('nextWave', () => {
  it('finds the first robot standing in the surf', () => {
    expect(
      nextWave([
        { id: 'far', agents: [{ id: 'a', status: 'idle' as const }] },
        {
          id: 'near',
          agents: [
            { id: 'b', status: 'working' as const },
            { id: 'c', status: 'needs-question' as const },
          ],
        },
      ]),
    ).toEqual({ workspaceId: 'near', agentId: 'c' })
  })
})

describe('nextMate', () => {
  it('cycles wondering robots', () => {
    const agents = [
      { id: 'a', status: 'needs-question' as const },
      { id: 'b', status: 'idle' as const },
      { id: 'c', status: 'needs-permission' as const },
    ]
    expect(nextMate(agents, null)).toBe('a')
    expect(nextMate(agents, 'a')).toBe('c')
    expect(nextMate(agents, 'c')).toBe('a')
    expect(nextMate([{ id: 'b', status: 'idle' }], null)).toBeNull()
  })
})
