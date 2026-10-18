export type AgentStatus =
  | 'idle'
  | 'working'
  | 'listening'
  | 'needs-input'
  | 'done'

export interface AgentRecord {
  id: string
  workspaceId: string
  name: string
  color: number
  parentId?: string
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

export interface AppState {
  workspaces: WorkspaceRecord[]
}
