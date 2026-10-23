import type { ShipLogEntry } from './ship-log'
import type { SkyChoice } from './time-of-day'
import type { Agent, CliId, Workspace } from '../types'

export interface CliChoice {
  id: CliId
  label: string
  command: string
  available: boolean
  bin: string | null
}

export interface Settings {
  cli: CliId
  sky: SkyChoice
  options: CliChoice[]
}

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

export function getSettings() {
  return request<Settings>('/api/settings')
}

export function updateSettings(input: { cli: CliId; sky: SkyChoice }) {
  return request<Settings>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
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

export function listLog() {
  return request<ShipLogEntry[]>('/api/log')
}

export function promptAgent(workspaceId: string, agentId: string, text: string) {
  return request<{ ok: boolean }>(
    `/api/workspaces/${workspaceId}/agents/${agentId}/prompt`,
    {
      method: 'POST',
      body: JSON.stringify({ text }),
    },
  )
}

export function answerAgent(workspaceId: string, agentId: string, text: string) {
  return request<{ ok: boolean }>(
    `/api/workspaces/${workspaceId}/agents/${agentId}/answer`,
    {
      method: 'POST',
      body: JSON.stringify({ text }),
    },
  )
}

export function focusAgent(workspaceId: string, agentId: string) {
  return request<{ ok: boolean }>(
    `/api/workspaces/${workspaceId}/agents/${agentId}/focus`,
    { method: 'POST' },
  )
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
    const port = import.meta.env.VITE_API_PORT || '8787'
    return `ws://127.0.0.1:${port}${path}`
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}${path}`
}
