import { classifyPrompt, stripAnsi, type PromptKind } from '../permission-detect.js'
import type { DetectedTask } from '../task-detect.js'
import { resolveBin } from './resolve-bin.js'
import type { CliAdapter } from './types.js'

const PERMISSION_RE =
  /(?:do you want to proceed|don'?t ask again|allow this|\bpermission\b)/i

const HINT_RE = /Task\s*\(|\bsub-?agents?\b|\bdelegat(?:e|ed|ing)\b/i

const LINE_RE =
  /Task\s*\(\s*([A-Za-z0-9][-A-Za-z0-9 _-]{1,40})\s*\)[^\n]{0,80}/gi

const DONE_RE = /\b(completed|finished|failed|cancelled|canceled|done|error)\b/i

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .trim()
    .slice(0, 24)
}

function classifyClaudePrompt(text: string): PromptKind {
  const recent = stripAnsi(text.slice(-8_000)).slice(-6_000)
  if (PERMISSION_RE.test(recent)) return 'permission'
  return classifyPrompt(text)
}

function looksLikeClaudeTask(chunk: string) {
  return HINT_RE.test(chunk)
}

function detectClaudeTasks(text: string): DetectedTask[] {
  const recent = stripAnsi(text.slice(-8_000)).slice(-6_000)
  const found = new Map<string, DetectedTask>()

  for (const match of recent.matchAll(LINE_RE)) {
    const line = match[0].replace(/\s+/g, ' ').trim()
    const rawName = match[1]?.trim()
    if (!rawName) continue
    const key = slug(rawName)
    if (!key) continue
    const done = DONE_RE.test(line)
    const prev = found.get(key)
    if (!prev || done) {
      found.set(key, { key, name: titleCase(rawName) || 'Task', done })
    }
  }

  return [...found.values()]
}

export const claudeCli: CliAdapter = {
  id: 'claude',
  label: 'Claude',
  command: 'claude',
  resolveBin() {
    return resolveBin({ envVar: 'CLAUDE_BIN', file: 'claude' })
  },
  args() {
    return []
  },
  looksLikeTaskChunk: looksLikeClaudeTask,
  detectTaskChildren: detectClaudeTasks,
  classifyPrompt: classifyClaudePrompt,
}
