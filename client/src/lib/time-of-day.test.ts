import { describe, expect, it, beforeEach } from 'vitest'
import {
  applySky,
  msUntilNextSky,
  parseSkyChoice,
  setSkyChoice,
  skyAt,
  skyForHour,
} from './time-of-day'

describe('parseSkyChoice', () => {
  it('accepts known values and defaults invalid input to auto', () => {
    expect(parseSkyChoice('night')).toBe('night')
    expect(parseSkyChoice('auto')).toBe('auto')
    expect(parseSkyChoice('invalid')).toBe('auto')
    expect(parseSkyChoice(null)).toBe('auto')
  })
})

describe('skyForHour', () => {
  it('maps hours to sky phases', () => {
    expect(skyForHour(6)).toBe('sunrise')
    expect(skyForHour(10)).toBe('day')
    expect(skyForHour(18)).toBe('sunset')
    expect(skyForHour(22)).toBe('night')
  })
})

describe('applySky', () => {
  beforeEach(() => {
    setSkyChoice('auto')
  })

  it('sets document dataset from clock in auto mode', () => {
    applySky(new Date('2026-06-15T14:00:00'))
    expect(document.documentElement.dataset.sky).toBe('day')
  })

  it('uses a fixed choice when not auto', () => {
    setSkyChoice('sunset')
    applySky(new Date('2026-06-15T14:00:00'))
    expect(document.documentElement.dataset.sky).toBe('sunset')
  })
})

describe('skyAt', () => {
  it('delegates to skyForHour', () => {
    expect(skyAt(new Date('2026-01-01T07:30:00'))).toBe('sunrise')
  })
})

describe('msUntilNextSky', () => {
  it('returns at least one second until the next boundary', () => {
    const ms = msUntilNextSky(new Date('2026-01-01T07:30:00'))
    expect(ms).toBeGreaterThanOrEqual(1000)
    expect(ms).toBeLessThanOrEqual(30 * 60 * 1000)
  })
})
