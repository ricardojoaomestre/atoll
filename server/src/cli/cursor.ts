import { classifyPrompt } from '../permission-detect.js'
import { detectTaskChildren, looksLikeTaskChunk } from '../task-detect.js'
import { resolveBin } from './resolve-bin.js'
import type { CliAdapter } from './types.js'

export const cursorCli: CliAdapter = {
  id: 'cursor',
  label: 'Cursor',
  command: 'agent --workspace <path> --trust',
  resolveBin() {
    return resolveBin({ envVar: 'CURSOR_AGENT_BIN', file: 'agent' })
  },
  args(workspacePath) {
    return ['--workspace', workspacePath, '--trust']
  },
  looksLikeTaskChunk,
  detectTaskChildren,
  classifyPrompt,
}
