import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import type { CliId } from './types.js'

const TIMEOUT_MS = 25_000

export function buildTitlePrompt(request: string, currentTitle?: string) {
  const lines = [
    'You name the current job of a coding agent.',
    'Given the developer request, output ONLY a short title: 2-5 words,',
    'in the same language as the request, no quotes, no trailing punctuation.',
    '',
  ]
  if (currentTitle) {
    lines.push(`The current title is: ${currentTitle}`)
    lines.push('If that still accurately describes the request, output it EXACTLY as given.')
    lines.push('')
  }
  lines.push('Request:', request)
  return lines.join('\n')
}

export function sanitizeTitle(raw: string): string | null {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*#\s]+/, '').trim())
    .filter(Boolean)
  let title = ''
  for (const line of lines) {
    const unquoted = unwrap(line).replace(/^(?:title|name)\s*:\s*/i, '').trim()
    if (!unquoted || unquoted.endsWith(':')) continue
    if (/^(?:sure|here(?:'s| is)|okay|ok|output|title)\b/i.test(unquoted)) continue
    title = unquoted
    break
  }
  title = title.replace(/\s+/g, ' ').replace(/[.!?,;:…]+$/g, '').trim()
  const words = title.split(' ').filter(Boolean)
  if (words.length > 5) title = words.slice(0, 5).join(' ')
  if (title.length > 48) {
    const cut = title.slice(0, 48)
    const space = cut.lastIndexOf(' ')
    title = (space > 12 ? cut.slice(0, space) : cut).trim()
  }
  if (title.length < 2) return null
  if (/^\/[a-z0-9-]+$/i.test(title)) return null
  return title
}

function unwrap(value: string) {
  let title = value.trim()
  while (title.length >= 2) {
    const first = title[0]
    const last = title[title.length - 1]
    const wrapped =
      (first === '"' && last === '"')
      || (first === "'" && last === "'")
      || (first === '“' && last === '”')
    if (!wrapped) break
    title = title.slice(1, -1).trim()
  }
  return title
}

function titleArgs(cli: CliId) {
  if (cli === 'claude') {
    return [
      '-p',
      '--model',
      'haiku',
      '--tools',
      '',
      '--disable-slash-commands',
      '--no-session-persistence',
      '--permission-mode',
      'plan',
      '--permission-prompts',
      'none',
      '--strict-mcp-config',
      '--mcp-config',
      '{"mcpServers":{}}',
      '--output-format',
      'text',
    ]
  }
  return [
    '-p',
    '--mode',
    'ask',
    '--model',
    'composer-2.5-fast',
    '--output-format',
    'text',
    '--sandbox',
    'enabled',
    '--trust',
    '--workspace',
    tmpdir(),
  ]
}

export function requestTitle(options: {
  bin: string
  cli: CliId
  request: string
  currentTitle?: string
  signal: AbortSignal
}) {
  const { bin, cli, request, currentTitle, signal } = options
  if (signal.aborted) return Promise.resolve(null)

  return new Promise<string | null>((resolve) => {
    const child = spawn(bin, titleArgs(cli), {
      cwd: tmpdir(),
      env: process.env,
      stdio: ['pipe', 'pipe', 'ignore'],
    })
    let settled = false
    let out = ''
    const finish = (title: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(title)
    }
    const stop = () => {
      if (!child.killed) child.kill('SIGTERM')
      const kill = setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL')
      }, 1000)
      kill.unref()
    }
    const timer = setTimeout(() => {
      stop()
      finish(null)
    }, TIMEOUT_MS)
    signal.addEventListener('abort', () => {
      stop()
      finish(null)
    }, { once: true })
    child.stdout.on('data', (chunk: Buffer) => {
      if (out.length < 4000) out += chunk.toString()
    })
    child.on('error', () => finish(null))
    child.on('close', (code) => {
      finish(code === 0 ? sanitizeTitle(out) : null)
    })
    child.stdin.end(buildTitlePrompt(request, currentTitle))
  })
}
