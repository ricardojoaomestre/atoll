import { describe, expect, it } from 'vitest'
import { beachSpots, crateLabel } from './beach'

describe('beachSpots', () => {
  it('puts sleepers inland and blocked robots in the surf', () => {
    const spots = beachSpots([
      { id: 'sleeper', status: 'idle' },
      { id: 'asker', status: 'needs-question' },
      { id: 'worker', status: 'working' },
    ])
    const sleeper = spots.get('sleeper')
    const asker = spots.get('asker')
    const worker = spots.get('worker')
    expect(sleeper).toBeDefined()
    expect(asker).toBeDefined()
    expect(worker).toBeDefined()
    expect(sleeper!.bottom).toBeGreaterThan(asker!.bottom)
    expect(asker!.shore).toBe(true)
    expect(worker!.pace).toBe(true)
    expect(sleeper!.pace).toBe(false)
  })

  it('queues robots that share a pose', () => {
    const spots = beachSpots([
      { id: 'a', status: 'working' },
      { id: 'b', status: 'working' },
    ])
    expect(spots.get('a')?.left).not.toBe(spots.get('b')?.left)
  })
})

describe('crateLabel', () => {
  it('shortens a long job', () => {
    expect(crateLabel('Refactor the island map view')).toBe('Refactor the is…')
    expect(crateLabel('   ')).toBe('')
  })
})
