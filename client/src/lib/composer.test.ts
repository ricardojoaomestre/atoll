import { describe, expect, it } from 'vitest'
import { composerMode } from './composer'

describe('composerMode', () => {
  it('offers a note to sleepers and a reply to the surf', () => {
    expect(composerMode('idle')).toBe('note')
    expect(composerMode('done')).toBe('note')
    expect(composerMode('needs-question')).toBe('answer')
    expect(composerMode('needs-permission')).toBe('answer')
    expect(composerMode('working')).toBeNull()
    expect(composerMode('unknown')).toBeNull()
  })
})
