import { afterEach, describe, expect, it, vi } from 'vitest'
import { dismissAgent, listWorkspaces, wsUrl } from './api'

describe('wsUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('points at the API host in development', () => {
    vi.stubEnv('DEV', true)
    expect(wsUrl('/api/events')).toBe('ws://127.0.0.1:8787/api/events')
  })

  it('uses the page host in production', () => {
    vi.stubEnv('DEV', false)
    Object.defineProperty(window, 'location', {
      value: { protocol: 'https:', host: 'app.example.com' },
      configurable: true,
    })
    expect(wsUrl('/api/events')).toBe('wss://app.example.com/api/events')
  })
})

describe('request helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'ws-1' }],
      }),
    )
    await expect(listWorkspaces()).resolves.toEqual([{ id: 'ws-1' }])
  })

  it('throws server errors with a message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'not found' }),
      }),
    )
    await expect(listWorkspaces()).rejects.toThrow('not found')
  })

  it('does not set Content-Type on DELETE without a body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await dismissAgent('ws-1', 'agent-1')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(init.method).toBe('DELETE')
    expect(headers.has('Content-Type')).toBe(false)
    expect(init.body).toBeUndefined()
  })
})
