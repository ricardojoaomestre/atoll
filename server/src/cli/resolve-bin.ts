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

export function resolveBin(options: { envVar: string; file: string }) {
  const fromEnv = process.env[options.envVar]
  if (fromEnv && isExecutable(fromEnv)) return fromEnv

  const candidates = [
    join(homedir(), '.local', 'bin', options.file),
    join('/usr/local/bin', options.file),
    join('/opt/homebrew/bin', options.file),
  ]
  for (const candidate of candidates) {
    if (isExecutable(candidate)) return candidate
  }

  try {
    const fromPath = execSync(`command -v ${options.file}`, {
      encoding: 'utf8',
      env: process.env,
    }).trim()
    if (fromPath && isExecutable(fromPath)) return fromPath
  } catch {
    // fall through
  }

  return null
}
