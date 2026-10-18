import { accessSync, constants } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

function isExecutable(path: string) {
  try {
    accessSync(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

export function resolveAgentBin(): string {
  if (process.env.CURSOR_AGENT_BIN && isExecutable(process.env.CURSOR_AGENT_BIN)) {
    return process.env.CURSOR_AGENT_BIN
  }

  const homeBin = join(homedir(), '.local', 'bin', 'agent')
  if (isExecutable(homeBin)) return homeBin

  for (const candidate of ['/usr/local/bin/agent', '/opt/homebrew/bin/agent']) {
    if (isExecutable(candidate)) return candidate
  }

  try {
    const fromPath = execSync('command -v agent', {
      encoding: 'utf8',
      env: process.env,
    }).trim()
    if (fromPath && isExecutable(fromPath)) return fromPath
  } catch {
    // fall through
  }

  return homeBin
}
