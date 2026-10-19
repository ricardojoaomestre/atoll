import { execFile } from 'node:child_process'
import { platform } from 'node:os'

export function pickFolder(): Promise<string | null> {
  if (platform() !== 'darwin') {
    return Promise.reject(new Error('Folder picker is only available on macOS'))
  }

  return new Promise((resolve, reject) => {
    execFile(
      'osascript',
      [
        '-e',
        'POSIX path of (choose folder with prompt "Select a project folder")',
      ],
      (error, stdout, stderr) => {
        if (error) {
          const detail = `${stderr} ${error.message}`
          const canceled =
            error.killed
            || detail.includes('User canceled')
            || detail.includes('User cancelled')
          if (canceled) {
            resolve(null)
            return
          }
          reject(error)
          return
        }
        const selected = stdout.trim().replace(/\/$/, '')
        resolve(selected || null)
      },
    )
  })
}
