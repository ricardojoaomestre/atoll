import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  mapStatus,
  nextAgentName,
  projectSnapshot,
  shellPane,
  shellReady,
  shellState,
  type HerdrSnapshot,
} from './project.js'

const snapshot: HerdrSnapshot = {
  workspaces: [
    {
      workspace_id: 'w5',
      label: 'atoll',
      number: 2,
      active_tab_id: 'w5:t1',
      worktree: { checkout_path: '/Users/dev/atoll' },
    },
    {
      workspace_id: 'w2',
      label: '  ',
      number: 1,
      active_tab_id: 'w2:t2',
    },
  ],
  tabs: [
    { tab_id: 'w5:t1', workspace_id: 'w5', label: '1', number: 1 },
    { tab_id: 'w2:t2', workspace_id: 'w2', label: 'review', number: 2 },
    { tab_id: 'w2:t1', workspace_id: 'w2', label: 'build', number: 1 },
  ],
  panes: [
    { pane_id: 'w5:p1', workspace_id: 'w5', tab_id: 'w5:t1', agent: 'cursor', cwd: '/ignored' },
    { pane_id: 'w2:p1', workspace_id: 'w2', tab_id: 'w2:t1', agent: null, cwd: '/repo' },
    { pane_id: 'w2:p2', workspace_id: 'w2', tab_id: 'w2:t2', agent: 'codex', foreground_cwd: '/repo/review' },
    { pane_id: 'w2:p3', workspace_id: 'w2', tab_id: 'w2:t1', agent: 'claude', cwd: '/repo' },
  ],
  agents: [
    {
      pane_id: 'w5:p1',
      workspace_id: 'w5',
      tab_id: 'w5:t1',
      agent: 'cursor',
      agent_status: 'working',
      terminal_title_stripped: 'Refactor the map',
      cwd: '/ignored',
    },
    {
      pane_id: 'w2:p3',
      workspace_id: 'w2',
      tab_id: 'w2:t1',
      agent: 'claude',
      agent_status: 'blocked',
      name: 'writer',
      cwd: '/repo',
    },
    {
      pane_id: 'w2:p2',
      workspace_id: 'w2',
      tab_id: 'w2:t2',
      agent: 'codex',
      agent_status: 'done',
      display_agent: 'Reviewer',
      tokens: { summary: 'Read the diff' },
      foreground_cwd: '/repo/review',
    },
    {
      pane_id: 'w2:p9',
      workspace_id: 'w2',
      tab_id: 'w2:t1',
      agent: null,
      agent_status: 'idle',
    },
  ],
}

describe('mapStatus', () => {
  it('maps Herdr states onto robot poses', () => {
    assert.equal(mapStatus('working'), 'working')
    assert.equal(mapStatus('idle'), 'idle')
    assert.equal(mapStatus('blocked'), 'needs-question')
    assert.equal(mapStatus('done'), 'done')
    assert.equal(mapStatus('unknown'), 'unknown')
  })
})

describe('projectSnapshot', () => {
  it('orders islands by Herdr and groups robots by dock', () => {
    const islands = projectSnapshot(snapshot)
    assert.deepEqual(islands.map((island) => island.id), ['w2', 'w5'])
    const second = islands[0]
    assert.equal(second.name, 'w2')
    assert.equal(second.path, '/repo')
    assert.deepEqual(second.tabs.map((tab) => tab.label), ['build', 'review'])
    assert.deepEqual(
      second.agents.map((agent) => [agent.tabLabel, agent.name, agent.status, agent.kind]),
      [
        ['build', 'writer', 'needs-question', 'claude'],
        ['review', 'Reviewer', 'done', 'codex'],
      ],
    )
    assert.equal(second.agents[1].summary, 'Read the diff')
    assert.equal(second.agents[1].cwd, '/repo/review')

    const first = islands[1]
    assert.equal(first.name, 'atoll')
    assert.equal(first.path, '/Users/dev/atoll')
    assert.equal(first.agents[0].summary, 'Refactor the map')
    assert.equal(first.agents[0].status, 'working')
  })
})

describe('shellReady', () => {
  it('accepts a pane whose foreground is the shell', () => {
    assert.equal(shellReady({ shell_pid: 10, foreground_processes: [] }), true)
    assert.equal(
      shellReady({
        shell_pid: 10,
        foreground_processes: [{ pid: 10, name: 'zsh' }],
      }),
      true,
    )
    assert.equal(
      shellReady({
        shell_pid: 10,
        foreground_processes: [{ pid: 44, name: 'claude' }],
      }),
      false,
    )
    assert.equal(shellReady({ shell_pid: null, foreground_processes: [] }), false)
  })

  it('treats a foreground command as busy', () => {
    assert.equal(shellState({ shell_pid: null, foreground_processes: [] }), 'starting')
    assert.equal(
      shellState({
        shell_pid: 10,
        foreground_processes: [{ pid: 44, name: 'claude' }],
      }),
      'busy',
    )
    assert.equal(
      shellState({
        shell_pid: 10,
        foreground_processes: [{ pid: 10, name: 'zsh' }],
      }),
      'ready',
    )
  })
})

describe('shellPane', () => {
  it('prefers a shell on the active dock', () => {
    const shell = shellPane(snapshot, 'w2', 'w2:t1')
    assert.equal(shell?.pane_id, 'w2:p1')
  })
})

describe('nextAgentName', () => {
  it('keeps names unique among live agents', () => {
    assert.equal(nextAgentName('Codex', ['cursor']), 'codex')
    assert.equal(nextAgentName('codex', ['codex', 'codex2']), 'codex3')
  })
})
