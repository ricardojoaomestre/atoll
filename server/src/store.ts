import { homedir } from 'node:os'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parseCliId } from './cli/index.js'
import type { AgentRecord, AppState, CliId, WorkspaceRecord } from './types.js'

const STATE_PATH = join(homedir(), '.atoll', 'state.json')
const LEGACY_STATE_PATH = join(homedir(), '.cursor-isles', 'state.json')

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

const STATUS_PERSIST_MS = 1_000
let persistTimer: ReturnType<typeof setTimeout> | undefined

async function persist() {
  await mkdir(dirname(STATE_PATH), { recursive: true })
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8')
}

function persistSoon() {
  if (persistTimer) return
  persistTimer = setTimeout(() => {
    persistTimer = undefined
    void persist()
  }, STATUS_PERSIST_MS)
}

async function persistNow() {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = undefined
  }
  await persist()
}

async function readStateFile() {
  try {
    return await readFile(STATE_PATH, 'utf8')
  } catch {
    try {
      const legacy = await readFile(LEGACY_STATE_PATH, 'utf8')
      await mkdir(dirname(STATE_PATH), { recursive: true })
      await writeFile(STATE_PATH, legacy, 'utf8')
      return legacy
    } catch {
      return null
    }
  }
}

export async function loadState() {
  try {
    const raw = await readStateFile()
    if (raw === null) throw new Error('missing')
    const parsed = JSON.parse(raw) as AppState
    state = {
      settings: { cli: parseCliId(parsed.settings?.cli) },
      workspaces: (parsed.workspaces ?? []).map((ws) => ({
        ...ws,
        agents: (ws.agents ?? []).map((agent) => ({
          ...agent,
          cli: agent.cli === 'claude' || agent.cli === 'cursor' ? agent.cli : undefined,
          status:
            agent.status === 'working'
            || agent.status === 'listening'
            || agent.status === 'needs-question'
            || agent.status === 'needs-permission'
            || (agent.status as string) === 'needs-input'
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

export function getSettings() {
  return { cli: parseCliId(state.settings?.cli) }
}

export async function setCli(cli: CliId) {
  state = { ...state, settings: { cli } }
  await persistNow()
  notify()
  return getSettings()
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
  state = { ...state, workspaces: [...state.workspaces, workspace] }
  await persistNow()
  notify()
  return workspace
}

export async function deleteWorkspace(workspaceId: string) {
  const existing = await getWorkspace(workspaceId)
  if (!existing) return null
  state = {
    ...state,
    workspaces: state.workspaces.filter((ws) => ws.id !== workspaceId),
  }
  await persistNow()
  notify()
  return existing
}

export async function addAgent(
  workspaceId: string,
  input: {
    name?: string
    parentId?: string
    color?: number
    source?: AgentRecord['source']
    cli?: CliId
    taskKey?: string
  },
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
    source: input.source ?? 'pty',
    cli: input.cli ?? getSettings().cli,
    taskKey: input.taskKey,
    status: 'working',
    x: 10 + Math.random() * 75,
    createdAt: new Date().toISOString(),
  }

  state = {
    ...state,
    workspaces: state.workspaces.map((ws) =>
      ws.id === workspaceId
        ? { ...ws, agents: [...ws.agents, agent] }
        : ws,
    ),
  }
  await persistNow()
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
    ...state,
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
    const statusOnly = Object.keys(patch).length === 1 && patch.status !== undefined
    if (statusOnly) persistSoon()
    else await persistNow()
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
    ...state,
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
  await persistNow()
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
