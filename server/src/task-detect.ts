import { stripAnsi } from './permission-detect.js'

const HINT_RE = /\b(?:task|sub-?agents?|delegat(?:e|ed|ing))\b/i

const LINE_RE =
  /[^\n]{0,24}(?:\btask\b|\bsub-?agents?\b|\blaunch(?:ing)? (?:a )?(?:sub-?)?agent\b)[^\n]{0,80}/gi

const TYPE_RE =
  /\b(explore|generalPurpose|general-purpose|best-of-n|best of n|shell|browser_use|computer_use)\b/i

const NAMED_RE = /(?:task|sub-?agent)\s*[:#]?\s+([A-Za-z0-9][-A-Za-z0-9 _/]{2,40})/i

const DONE_RE = /\b(completed|finished|failed|cancelled|done)\b/i

export type DetectedTask = {
  key: string
  name: string
  done: boolean
}

export function looksLikeTaskChunk(chunk: string) {
  return HINT_RE.test(chunk)
}

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

export function detectTaskChildren(text: string): DetectedTask[] {
  const recent = stripAnsi(text.slice(-8_000)).slice(-6_000)
  const found = new Map<string, DetectedTask>()

  for (const match of recent.matchAll(LINE_RE)) {
    const line = match[0].replace(/\s+/g, ' ').trim()
    if (line.length < 4) continue

    const typeMatch = line.match(TYPE_RE)
    const named = line.match(NAMED_RE)
    const rawName = (typeMatch?.[1] ?? named?.[1] ?? 'Task').trim()
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
