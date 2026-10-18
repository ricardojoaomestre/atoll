import { homedir } from 'node:os'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { AgentRecord, AppState, WorkspaceRecord } from './types.js'

const STATE_PATH = join(homedir(), '.cursor-isles', 'state.json')

const EMPTY: AppState = { workspaces: [] }

let state: AppState = structuredClone(EMPTY)
const listeners = new Set<() => void>()

export function getStatePath() {
  return STATE_PATH
}

export function getState(): AppState {
  return state
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  for (const listener of listeners) listener()
}

async function persist() {
  await mkdir(dirname(STATE_PATH), { recursive: true })
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8')
}

export async function loadState() {
  try {
    const raw = await readFile(STATE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as AppState
    state = {
      workspaces: (parsed.workspaces ?? []).map((ws) => ({
        ...ws,
        agents: (ws.agents ?? []).map((agent) => ({
          ...agent,
          status:
            agent.status === 'working'
            || agent.status === 'needs-input'
            || agent.status === 'listening'
              ? 'idle'
              : agent.status,
        })),
      })),
    }
  } catch {
    state = structuredClone(EMPTY)
    await persist()
  }
}

function id() {
  return Math.random().toString(36).slice(2, 10)
}

export function expandHome(path: string) {
  if (path.startsWith('~/') || path === '~') {
    return join(homedir(), path.slice(2))
  }
  return path
}

export async function listWorkspaces() {
  return state.workspaces
}

export async function getWorkspace(workspaceId: string) {
  return state.workspaces.find((ws) => ws.id === workspaceId) ?? null
}

export async function createWorkspace(name: string, path: string) {
  const workspace: WorkspaceRecord = {
    id: id(),
    name: name.trim(),
    path: expandHome(path.trim()),
    hue: Math.floor(Math.random() * 360),
    agents: [],
    createdAt: new Date().toISOString(),
  }
  state = { workspaces: [...state.workspaces, workspace] }
  await persist()
  notify()
  return workspace
}

export async function deleteWorkspace(workspaceId: string) {
  const existing = await getWorkspace(workspaceId)
  if (!existing) return null
  state = {
    workspaces: state.workspaces.filter((ws) => ws.id !== workspaceId),
  }
  await persist()
  notify()
  return existing
}

export async function addAgent(
  workspaceId: string,
  input: { name?: string; parentId?: string; color?: number },
) {
  const workspace = await getWorkspace(workspaceId)
  if (!workspace) return null

  const names = [
    'Pixel', 'Byte', 'Nova', 'Ziggy', 'Echo',
    'Rook', 'Mochi', 'Bolt', 'Kiwi', 'Juno',
  ]
  const agent: AgentRecord = {
    id: id(),
    workspaceId,
    name: input.name?.trim()
      || names[Math.floor(Math.random() * names.length)]
        + (input.parentId ? ' jr' : ''),
    color: input.color ?? Math.floor(Math.random() * 360),
    parentId: input.parentId,
    status: 'working',
    x: 10 + Math.random() * 75,
    createdAt: new Date().toISOString(),
  }

  state = {
    workspaces: state.workspaces.map((ws) =>
      ws.id === workspaceId
        ? { ...ws, agents: [...ws.agents, agent] }
        : ws,
    ),
  }
  await persist()
  notify()
  return agent
}

export async function updateAgent(
  workspaceId: string,
  agentId: string,
  patch: Partial<Pick<AgentRecord, 'status' | 'name' | 'color'>>,
) {
  let updated: AgentRecord | null = null
  state = {
    workspaces: state.workspaces.map((ws) => {
      if (ws.id !== workspaceId) return ws
      return {
        ...ws,
        agents: ws.agents.map((agent) => {
          if (agent.id !== agentId) return agent
          updated = { ...agent, ...patch }
          return updated
        }),
      }
    }),
  }
  if (updated) {
    await persist()
    notify()
  }
  return updated
}

export async function removeAgent(workspaceId: string, agentId: string) {
  const workspace = await getWorkspace(workspaceId)
  if (!workspace) return null
  const target = workspace.agents.find((a) => a.id === agentId)
  if (!target) return null

  state = {
    workspaces: state.workspaces.map((ws) => {
      if (ws.id !== workspaceId) return ws
      return {
        ...ws,
        agents: ws.agents.filter(
          (a) => a.id !== agentId && a.parentId !== agentId,
        ),
      }
    }),
  }
  await persist()
  notify()
  return target
}

export async function getAgent(agentId: string) {
  for (const ws of state.workspaces) {
    const agent = ws.agents.find((a) => a.id === agentId)
    if (agent) return { workspace: ws, agent }
  }
  return null
}
