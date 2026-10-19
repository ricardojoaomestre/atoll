import { describe, expect, it } from 'vitest'
import { shortenPath } from './shorten-path'

const charWidth = (value: string) => value.length

describe('shortenPath', () => {
  it('returns the path when it fits', () => {
    expect(shortenPath('/a/b', 10, charWidth)).toBe('/a/b')
  })

  it('drops the leaf segment when parents still fit', () => {
    expect(shortenPath('/ab/cd/ef', 6, charWidth)).toBe('/ab/cd')
  })

  it('collapses the middle with a marker when needed', () => {
    const path = '/Users/ricardomestre/projects/cursor-isles/client/src'
    const shortened = shortenPath(path, 36, charWidth)
    expect(shortened).toContain('....')
    expect(shortened.length).toBeLessThanOrEqual(36)
  })

  it('handles empty input', () => {
    expect(shortenPath('   ', 10, charWidth)).toBe('')
  })
})
