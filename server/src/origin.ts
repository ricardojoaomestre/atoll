import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function hasPushedToOrigin(repoPath: string): Promise<boolean> {
  try {
    await execFileAsync(
      'git',
      ['-C', repoPath, 'remote', 'get-url', 'origin'],
      { timeout: 4000 },
    )
    const { stdout } = await execFileAsync(
      'git',
      ['-C', repoPath, 'rev-list', '-1', '--remotes=origin'],
      { timeout: 4000 },
    )
    return stdout.trim().length > 0
  } catch {
    return false
  }
}
