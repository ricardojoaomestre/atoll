import type { Page } from '@playwright/test'
import type { Agent, Workspace } from '../client/src/types'

export const defaultSettings = {
  cli: 'cursor' as const,
  sky: 'auto' as const,
  options: [
    {
      id: 'cursor' as const,
      label: 'Cursor',
      command: 'agent',
      available: true,
      bin: '/usr/bin/agent',
    },
    {
      id: 'claude' as const,
      label: 'Claude',
      command: 'claude',
      available: false,
      bin: null,
    },
  ],
}

export function sampleWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 'ws-demo',
    name: 'Demo Island',
    path: '/tmp/demo',
    hue: 210,
    agents: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    firstCommitAt: null,
    hasCamp: false,
    ...overrides,
  }
}

export function sampleAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-demo',
    workspaceId: 'ws-demo',
    name: 'Pixel',
    color: 200,
    status: 'idle',
    x: 40,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export async function mockAppApi(
  page: Page,
  options: {
    workspaces?: Workspace[]
    workspaceById?: Record<string, Workspace | null>
  } = {},
) {
  const workspaces = options.workspaces ?? []
  const workspaceById = options.workspaceById ?? Object.fromEntries(
    workspaces.map((ws) => [ws.id, ws]),
  )

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const { pathname } = url
    const method = route.request().method()

    if (pathname === '/api/settings' && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(defaultSettings),
      })
    }

    if (pathname === '/api/log' && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    }

    if (pathname === '/api/workspaces' && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(workspaces),
      })
    }

    const workspaceMatch = pathname.match(/^\/api\/workspaces\/([^/]+)$/)
    if (workspaceMatch && method === 'GET') {
      const id = workspaceMatch[1]
      const workspace = workspaceById[id]
      if (!workspace) {
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'not found' }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(workspace),
      })
    }

    if (pathname === '/api/events') {
      return route.abort()
    }

    return route.fulfill({
      status: 501,
      contentType: 'application/json',
      body: JSON.stringify({ error: `unmocked ${method} ${pathname}` }),
    })
  })
}
