import type { Agent, Workspace } from '../types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(path, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export function listWorkspaces() {
  return request<Workspace[]>('/api/workspaces')
}

export function getWorkspace(id: string) {
  return request<Workspace>(`/api/workspaces/${id}`)
}

export function pickFolder() {
  return request<{ path: string | null }>('/api/pick-folder', { method: 'POST' })
}

export function createWorkspace(name: string, path: string) {
  return request<Workspace>('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name, path }),
  })
}

export function deleteWorkspace(id: string) {
  return request<{ ok: boolean }>(`/api/workspaces/${id}`, { method: 'DELETE' })
}

export function spawnAgent(workspaceId: string, name?: string) {
  return request<Agent>(`/api/workspaces/${workspaceId}/agents`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function spawnSubAgent(workspaceId: string, agentId: string, name?: string) {
  return request<Agent>(`/api/workspaces/${workspaceId}/agents/${agentId}/sub`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function dismissAgent(workspaceId: string, agentId: string) {
  return request<{ ok: boolean }>(
    `/api/workspaces/${workspaceId}/agents/${agentId}`,
    { method: 'DELETE' },
  )
}

export function wsUrl(path: string) {
  // In Vite dev, talk to the API host directly so PTY websockets
  // are not dropped by the HTTP proxy upgrade path.
  if (import.meta.env.DEV) {
    return `ws://127.0.0.1:8787${path}`
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}${path}`
}
