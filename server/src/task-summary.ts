const PLACEHOLDER =
  /^(?:plan, search, build anything|add a follow-up\b.*|run a command\b.*|tell the agent what to do\b.*|describe how to revise\b.*)$/i

const MAX = 72

export function shortTask(raw: string): string | null {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (text.length < 2 || PLACEHOLDER.test(text)) return null
  if (/^\/[a-z0-9-]+$/i.test(text)) return null
  if (text.length <= MAX) return text
  const cut = text.slice(0, MAX - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > 24 ? cut.slice(0, space) : cut).trimEnd()}…`
}

export function consumeInput(draft: string, data: string) {
  const parts: string[] = []
  let i = 0
  while (i < data.length) {
    if (data[i] === '\x1b') {
      const match = /^\x1b(?:\[[0-9;?]*[ -/]*[@-~]|O[A-Za-z])/.exec(data.slice(i))
      i += match ? match[0].length : 1
      continue
    }
    const ch = data[i]
    if (ch === '\r') {
      parts.push(draft)
      draft = ''
      i += 1
      continue
    }
    if (ch === '\n') {
      if (draft && !draft.endsWith(' ')) draft += ' '
      i += 1
      continue
    }
    if (ch === '\x7f' || ch === '\b') {
      draft = Array.from(draft).slice(0, -1).join('')
      i += 1
      continue
    }
    if (ch === '\x15' || ch === '\x03') {
      draft = ''
      i += 1
      continue
    }
    if (ch >= ' ') draft += ch
    i += 1
  }
  const submitted = parts.length
    ? parts.map((part) => part.trim()).filter(Boolean).join(' ')
    : null
  return { draft, submitted }
}
