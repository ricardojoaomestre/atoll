export type AgentStatus = 'idle' | 'working' | 'needs-input' | 'done'

export interface Agent {
  id: string
  workspaceId: string
  name: string
  color: number
  parentId?: string
  status: AgentStatus
  x: number
  createdAt: string
}

export interface Workspace {
  id: string
  name: string
  path: string
  hue: number
  agents: Agent[]
  createdAt: string
}
