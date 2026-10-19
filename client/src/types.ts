export type AgentStatus =
  | 'idle'
  | 'working'
  | 'listening'
  | 'needs-question'
  | 'needs-permission'
  | 'done'

export type AgentSource = 'pty' | 'task'

export type CliId = 'cursor' | 'claude'

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
  firstCommitAt: string | null
  hasCamp: boolean
}
