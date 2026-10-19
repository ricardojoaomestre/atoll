export type AgentStatus =
  | 'idle'
  | 'working'
  | 'listening'
  | 'needs-question'
  | 'needs-permission'
  | 'done'

export type AgentSource = 'pty' | 'task'

export type CliId = 'cursor' | 'claude'

export type SkyChoice = 'auto' | 'sunrise' | 'day' | 'sunset' | 'night'

export interface AgentRecord {
  id: string
  workspaceId: string
  name: string
  color: number
  parentId?: string
  source?: AgentSource
  cli?: CliId
  taskKey?: string
  status: AgentStatus
  x: number
  createdAt: string
}

export interface WorkspaceRecord {
  id: string
  name: string
  path: string
  hue: number
  agents: AgentRecord[]
  createdAt: string
}

export interface AppSettings {
  cli: CliId
  sky: SkyChoice
}

export interface AppState {
  workspaces: WorkspaceRecord[]
  settings?: AppSettings
}
