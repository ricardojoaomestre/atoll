import type { DetectedTask } from '../task-detect.js'
import type { PromptKind } from '../permission-detect.js'

export type CliId = 'cursor' | 'claude'

export interface CliAdapter {
  id: CliId
  label: string
  command: string
  resolveBin(): string | null
  args(workspacePath: string): string[]
  looksLikeTaskChunk(chunk: string): boolean
  detectTaskChildren(text: string): DetectedTask[]
  classifyPrompt(text: string): PromptKind
}
