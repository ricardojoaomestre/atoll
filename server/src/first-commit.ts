import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function firstCommitAt(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', repoPath, 'log', '--reverse', '-1', '--format=%aI'],
      { timeout: 4000 },
    )
    const value = stdout.trim()
    const time = Date.parse(value)
    if (!value || Number.isNaN(time)) return null
    return new Date(time).toISOString()
  } catch {
    return null
  }
}
