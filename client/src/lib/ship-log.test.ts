import { describe, expect, it } from 'vitest'
import { formatLogTime } from './ship-log'

describe('formatLogTime', () => {
  it('prints the hour and minute', () => {
    const date = new Date(2026, 9, 23, 14, 9)
    expect(formatLogTime(date.toISOString())).toBe('14:09')
  })

  it('returns nothing for a blank stamp', () => {
    expect(formatLogTime('nope')).toBe('')
  })
})
