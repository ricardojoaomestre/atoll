import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { diffShipLog } from './log.js'
import { canAnswer, canTakeNote, readSpeech } from './speech.js'

const at = '2026-10-23T14:09:00.000Z'

describe('diffShipLog', () => {
  it('stays quiet on the first snapshot', () => {
    const next = [
      {
        id: 'w1',
        name: 'atoll',
        agents: [{ id: 'w1:p1', name: 'cursor', status: 'working' as const }],
      },
    ]
    assert.deepEqual(diffShipLog(null, next, at), [])
  })

  it('writes a line when a robot changes pose', () => {
    const previous = [
      {
        id: 'w1',
        name: 'atoll',
        agents: [
          { id: 'w1:p1', name: 'cursor', status: 'idle' as const, summary: 'Read the map' },
        ],
      },
    ]
    const next = [
      {
        id: 'w1',
        name: 'atoll',
        agents: [
          { id: 'w1:p1', name: 'cursor', status: 'working' as const, summary: 'Read the map' },
        ],
      },
    ]
    assert.deepEqual(diffShipLog(previous, next, at), [
      {
        id: `${at}:w1:p1:working`,
        at,
        workspaceId: 'w1',
        agentId: 'w1:p1',
        text: 'cursor picked up a crate on atoll · Read the map',
      },
    ])
  })

  it('ignores a summary change that keeps the same pose', () => {
    const previous = [
      {
        id: 'w1',
        name: 'atoll',
        agents: [{ id: 'w1:p1', name: 'cursor', status: 'working' as const, summary: 'Old' }],
      },
    ]
    const next = [
      {
        id: 'w1',
        name: 'atoll',
        agents: [{ id: 'w1:p1', name: 'cursor', status: 'working' as const, summary: 'New' }],
      },
    ]
    assert.deepEqual(diffShipLog(previous, next, at), [])
  })

  it('notes arrivals, the surf, and departures', () => {
    const previous = [
      {
        id: 'w1',
        name: 'atoll',
        agents: [{ id: 'w1:p1', name: 'cursor', status: 'working' as const }],
      },
    ]
    const next = [
      {
        id: 'w1',
        name: 'atoll',
        agents: [{ id: 'w1:p2', name: 'claude', status: 'needs-question' as const }],
      },
    ]
    const lines = diffShipLog(previous, next, at).map((entry) => entry.text)
    assert.deepEqual(lines, [
      'claude came ashore on atoll',
      'cursor walked into the sea',
    ])
  })
})

describe('readSpeech', () => {
  it('trims a note and rejects empty or huge text', () => {
    assert.equal(readSpeech('  look at the dock  '), 'look at the dock')
    assert.equal(readSpeech('   '), null)
    assert.equal(readSpeech(4), null)
    assert.equal(readSpeech('x'.repeat(2001)), null)
  })
})

describe('who can be spoken to', () => {
  it('takes a note from sleepers and finished robots', () => {
    assert.equal(canTakeNote('idle'), true)
    assert.equal(canTakeNote('done'), true)
    assert.equal(canTakeNote('working'), false)
    assert.equal(canTakeNote('needs-question'), false)
  })

  it('answers robots standing in the surf', () => {
    assert.equal(canAnswer('needs-question'), true)
    assert.equal(canAnswer('needs-permission'), true)
    assert.equal(canAnswer('idle'), false)
  })
})
