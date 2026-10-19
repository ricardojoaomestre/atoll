import type { Agent, Workspace } from '../types'

export function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-1',
    workspaceId: 'ws-1',
    name: 'Pixel',
    color: 200,
    status: 'idle',
    x: 50,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 'ws-1',
    name: 'Test Island',
    path: '/Users/dev/projects/demo',
    hue: 180,
    agents: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    firstCommitAt: null,
    hasCamp: false,
    ...overrides,
  }
}
