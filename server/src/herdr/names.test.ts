import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ISLAND_NAMES, islandName } from './names.js'

describe('islandName', () => {
  it('keeps thirty distinct funny names', () => {
    assert.equal(ISLAND_NAMES.length, 30)
    assert.equal(new Set(ISLAND_NAMES).size, 30)
  })

  it('gives the same pane the same name and skips names already on the island', () => {
    const first = islandName('w5:p1', new Set())
    assert.equal(islandName('w5:p1', new Set()), first)
    assert.equal(ISLAND_NAMES.includes(first), true)
    const second = islandName('w5:p1', new Set([first]))
    assert.notEqual(second, first)
  })
})
