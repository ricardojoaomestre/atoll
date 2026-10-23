export type AgentStatus =
  | 'idle'
  | 'working'
  | 'listening'
  | 'needs-question'
  | 'needs-permission'
  | 'done'
  | 'unknown'

export type AgentSource = 'pty' | 'task'

export type CliId = string

export interface Agent {
  id: string
  workspaceId: string
  name: string
  color: number
  parentId?: string
  source?: AgentSource
  cli?: CliId
  taskKey?: string
  status: AgentStatus
  summary?: string
  kind?: string
  cwd?: string
  tabId?: string
  tabLabel?: string
  x: number
  createdAt: string
}

export interface WorkspaceTab {
  id: string
  label: string
}

export interface Workspace {
  id: string
  name: string
  path: string
  hue: number
  agents: Agent[]
  tabs?: WorkspaceTab[]
  createdAt: string
  firstCommitAt: string | null
  hasCamp: boolean
}
