import { describe, expect, it } from 'vitest'
import { treeCount } from './tree-count'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

describe('treeCount', () => {
  it('returns one tree when there is no first commit', () => {
    expect(treeCount(null)).toBe(1)
    expect(treeCount(undefined)).toBe(1)
    expect(treeCount('not-a-date')).toBe(1)
  })

  it('grows up to four trees over a week', () => {
    const started = Date.parse('2026-01-01T12:00:00.000Z')
    expect(treeCount(new Date(started).toISOString(), started)).toBe(1)
    expect(treeCount(new Date(started).toISOString(), started + WEEK_MS / 3)).toBe(2)
    expect(treeCount(new Date(started).toISOString(), started + (2 * WEEK_MS) / 3)).toBe(3)
    expect(treeCount(new Date(started).toISOString(), started + WEEK_MS)).toBe(4)
    expect(treeCount(new Date(started).toISOString(), started + WEEK_MS * 2)).toBe(4)
  })
})
