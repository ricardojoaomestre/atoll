import { claudeCli } from './claude.js'
import { cursorCli } from './cursor.js'
import type { CliAdapter, CliId } from './types.js'

const CLIS: Record<CliId, CliAdapter> = {
  cursor: cursorCli,
  claude: claudeCli,
}

export function parseCliId(value: unknown): CliId {
  return value === 'claude' ? 'claude' : 'cursor'
}

export function getCli(id: CliId | undefined): CliAdapter {
  return CLIS[id ?? 'cursor'] ?? cursorCli
}

export function listCliChoices() {
  return Object.values(CLIS).map((cli) => {
    const bin = cli.resolveBin()
    return {
      id: cli.id,
      label: cli.label,
      command: cli.command,
      available: bin !== null,
      bin,
    }
  })
}

export type { CliAdapter, CliId }
