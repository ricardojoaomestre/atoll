import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { lastTaskResult } from './result.js'

const idle = `
  $ git commit
    … 3 input lines hidden · ctrl+o to expand
    nothing to commit, working tree clean

  Committed on explore/herdr as 5a96a17.

  Picture the Herdr session on the beach, and let the island take a note.

  The working tree is clean. I did not push.

 ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  → Add a follow-up
`

const working = `
  $ git commit 431ms
    … 3 output lines hidden · ctrl+o to expand

  Committed on explore/herdr as 36a09c8: wait for a ready shell.

  create random names for the agents.

  Agents currently show their kind.

    Grepped names in the server
  ⠰ Running  10k tokens
    Tip: Use /debug to instrument and debug complex problems.
 ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  → Add a follow-up
`

describe('lastTaskResult', () => {
  it('quotes the reply sitting above an idle prompt', () => {
    assert.equal(
      lastTaskResult(idle),
      'Committed on explore/herdr as 5a96a17. Picture the Herdr session on the beach, and let the island take a note. The working tree is clean. I did not push.',
    )
  })

  it('keeps the finished reply when a new job is already running', () => {
    assert.equal(
      lastTaskResult(working),
      'Committed on explore/herdr as 36a09c8: wait for a ready shell.',
    )
  })

  it('stays quiet when the scrollback is only tools', () => {
    assert.equal(lastTaskResult('$ ls\n  Grepped names\n'), null)
  })
})
