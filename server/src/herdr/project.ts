import type { AgentStatus } from '../types.js'

export interface HerdrAgentInfo {
  pane_id: string
  workspace_id: string
  tab_id: string
  agent?: string | null
  agent_status: string
  name?: string | null
  display_agent?: string | null
  cwd?: string | null
  foreground_cwd?: string | null
  title?: string | null
  terminal_title_stripped?: string | null
  state_labels?: Record<string, string> | null
  tokens?: Record<string, string> | null
}

export interface HerdrPaneInfo {
  pane_id: string
  workspace_id: string
  tab_id: string
  agent?: string | null
  cwd?: string | null
  foreground_cwd?: string | null
}

export interface HerdrTabInfo {
  tab_id: string
  workspace_id: string
  label: string
  number: number
}

export interface HerdrWorkspaceInfo {
  workspace_id: string
  label: string
  number: number
  active_tab_id: string
  worktree?: { checkout_path?: string | null } | null
}

export interface HerdrSnapshot {
  workspaces: HerdrWorkspaceInfo[]
  tabs: HerdrTabInfo[]
  panes: HerdrPaneInfo[]
  agents: HerdrAgentInfo[]
}

export interface ProjectedTab {
  id: string
  label: string
}

export interface ProjectedAgent {
  id: string
  workspaceId: string
  name: string
  color: number
  status: AgentStatus
  summary?: string
  kind?: string
  cwd?: string
  tabId?: string
  tabLabel?: string
  x: number
  createdAt: string
}

export interface ProjectedWorkspace {
  id: string
  name: string
  path: string
  hue: number
  agents: ProjectedAgent[]
  tabs: ProjectedTab[]
  createdAt: string
}

const CREATED_AT = '1970-01-01T00:00:00.000Z'

export function mapStatus(status: string): AgentStatus {
  switch (status) {
    case 'working':
      return 'working'
    case 'idle':
      return 'idle'
    case 'blocked':
      return 'needs-question'
    case 'done':
      return 'done'
    default:
      return 'unknown'
  }
}

export function hueFor(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  return hash % 360
}

export function nextAgentName(kind: string, used: Iterable<string>) {
  const taken = new Set(used)
  const raw = kind.toLowerCase().replace(/[^a-z0-9_-]/g, '')
  const stem = (raw.replace(/^[^a-z]+/, '') || 'mate').slice(0, 28)
  if (!taken.has(stem)) return stem
  for (let n = 2; n < 1000; n += 1) {
    const suffix = String(n)
    const name = `${stem.slice(0, 32 - suffix.length)}${suffix}`
    if (!taken.has(name)) return name
  }
  return `mate${(taken.size + 1).toString(36)}`
}

function cwdOf(row: { foreground_cwd?: string | null; cwd?: string | null }) {
  const path = row.foreground_cwd || row.cwd
  return path && path.trim() ? path : null
}

function mostCommon(paths: string[]) {
  const counts = new Map<string, number>()
  for (const path of paths) counts.set(path, (counts.get(path) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

function calm(text: string) {
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[.\u00b7\u2026\u2022]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function summaryOf(agent: HerdrAgentInfo) {
  const raw = [
    agent.tokens?.summary,
    agent.title,
    agent.state_labels?.[agent.agent_status],
    agent.terminal_title_stripped,
  ]
    .map((value) => value?.trim())
    .find((value) => value)
  if (!raw) return undefined
  return calm(raw) || undefined
}

export function projectSnapshot(snapshot: HerdrSnapshot): ProjectedWorkspace[] {
  const tabs = [...snapshot.tabs].sort((a, b) => a.number - b.number)
  const tabsByWorkspace = new Map<string, HerdrTabInfo[]>()
  for (const tab of tabs) {
    const list = tabsByWorkspace.get(tab.workspace_id) ?? []
    list.push(tab)
    tabsByWorkspace.set(tab.workspace_id, list)
  }

  const workspaces = [...snapshot.workspaces].sort((a, b) => a.number - b.number)
  return workspaces.map((workspace) => {
    const workspaceTabs = tabsByWorkspace.get(workspace.workspace_id) ?? []
    const tabLabel = new Map(workspaceTabs.map((tab) => [tab.tab_id, tab.label]))
    const tabOrder = new Map(workspaceTabs.map((tab, index) => [tab.tab_id, index]))
    const agents = snapshot.agents
      .filter((agent) => agent.workspace_id === workspace.workspace_id && agent.agent)
      .sort((a, b) => {
        const tabDelta = (tabOrder.get(a.tab_id) ?? 0) - (tabOrder.get(b.tab_id) ?? 0)
        if (tabDelta !== 0) return tabDelta
        return a.pane_id.localeCompare(b.pane_id)
      })
    const panePaths = snapshot.panes
      .filter((pane) => pane.workspace_id === workspace.workspace_id)
      .map(cwdOf)
      .filter((path): path is string => Boolean(path))
    const checkout = workspace.worktree?.checkout_path?.trim()
    const path = checkout || mostCommon(panePaths)

    return {
      id: workspace.workspace_id,
      name: workspace.label.trim() || workspace.workspace_id,
      path,
      hue: hueFor(workspace.workspace_id),
      createdAt: CREATED_AT,
      tabs: workspaceTabs.map((tab) => ({
        id: tab.tab_id,
        label: tab.label.trim() || String(tab.number),
      })),
      agents: agents.map((agent, index) => {
        const kind = agent.agent?.trim() || 'agent'
        const named = agent.display_agent?.trim() || agent.name?.trim()
        const cwd = cwdOf(agent) ?? undefined
        return {
          id: agent.pane_id,
          workspaceId: workspace.workspace_id,
          name: named || kind,
          color: hueFor(kind),
          status: mapStatus(agent.agent_status),
          summary: summaryOf(agent),
          kind,
          cwd,
          tabId: agent.tab_id,
          tabLabel: tabLabel.get(agent.tab_id),
          x: 12 + index * 14,
          createdAt: CREATED_AT,
        }
      }),
    }
  })
}

const SHELL_NAMES = new Set(['zsh', 'bash', 'fish', 'sh', 'dash', 'ksh', '-zsh', '-bash', '-fish'])

export function shellReady(info: {
  shell_pid?: number | null
  foreground_processes?: Array<{ pid: number; name: string }> | null
}) {
  if (!info.shell_pid) return false
  const foreground = info.foreground_processes ?? []
  if (foreground.length === 0) return true
  return foreground.every(
    (proc) => proc.pid === info.shell_pid || SHELL_NAMES.has(proc.name),
  )
}

export function shellState(info: {
  shell_pid?: number | null
  foreground_processes?: Array<{ pid: number; name: string }> | null
}): 'ready' | 'starting' | 'busy' {
  if (shellReady(info)) return 'ready'
  const foreground = info.foreground_processes ?? []
  if (!info.shell_pid) return foreground.length > 0 ? 'busy' : 'starting'
  const occupied = foreground.some(
    (proc) => proc.pid !== info.shell_pid && !SHELL_NAMES.has(proc.name),
  )
  return occupied ? 'busy' : 'starting'
}

export function shellPanes(
  snapshot: HerdrSnapshot,
  workspaceId: string,
  activeTabId: string,
) {
  const shells = snapshot.panes.filter(
    (pane) => pane.workspace_id === workspaceId && !pane.agent,
  )
  return [
    ...shells.filter((pane) => pane.tab_id === activeTabId),
    ...shells.filter((pane) => pane.tab_id !== activeTabId),
  ]
}

export function shellPane(
  snapshot: HerdrSnapshot,
  workspaceId: string,
  activeTabId: string,
) {
  return shellPanes(snapshot, workspaceId, activeTabId)[0] ?? null
}

export function splitTarget(snapshot: HerdrSnapshot, workspaceId: string, activeTabId: string) {
  const panes = snapshot.panes.filter((pane) => pane.workspace_id === workspaceId)
  return (
    panes.find((pane) => pane.tab_id === activeTabId) ??
    panes[0] ??
    null
  )
}
