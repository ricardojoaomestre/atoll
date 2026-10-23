const MAX_RESULT = 480

function isNoise(line: string) {
  const text = line.trim()
  if (!text) return false
  if (/[▄▀█░▒▓─━═]{8,}/.test(text)) return true
  if (/^\$\s/.test(text)) return true
  if (/ctrl\+[a-z0-9]/i.test(text)) return true
  if (/^tip:/i.test(text)) return true
  if (/^→/.test(text)) return true
  if (/hidden/.test(text)) return true
  if (text.startsWith('▎')) return true
  if (/^[\u2800-\u28FF]/.test(text)) return true
  if (/\btokens?\b/i.test(text) && text.length < 48) return true
  if (/^(edited|grepped|listed|searched)\b/i.test(text)) return true
  if (/^read\s+(\/|\S+\.\w+)/i.test(text)) return true
  if (/^running\b/i.test(text)) return true
  if (/^~\//.test(text)) return true
  return false
}

function paragraphs(text: string) {
  const lines = text.replace(/\r/g, '').split('\n')
  const footer = lines.findIndex((line) => /[▄▀]{10,}/.test(line))
  const body = (footer === -1 ? lines : lines.slice(0, footer)).join('\n')
  return body.split(/\n\s*\n/).flatMap((chunk) => {
    const rows = chunk.split('\n').map((line) => line.trim()).filter(Boolean)
    if (rows.length === 0) return []
    const command = rows.some((line) => /^\$\s/.test(line))
    if (rows.some((line) => isNoise(line))) return [{ prose: false, command, text: '' }]
    const prose = rows.filter((line) => /[a-z]/i.test(line))
    if (prose.length === 0) return [{ prose: false, command, text: '' }]
    return [{ prose: true, command: false, text: prose.join(' ') }]
  })
}

function clip(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length < 12) return null
  if (clean.length <= MAX_RESULT) return clean
  return `${clean.slice(0, MAX_RESULT - 1).trim()}…`
}

export function lastTaskResult(text: string) {
  const parts = paragraphs(text)
  let result: string | null = null
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]
    if (part.prose || !part.command) continue
    const reply: string[] = []
    let next = index + 1
    while (next < parts.length && parts[next].prose) {
      reply.push(parts[next].text)
      next += 1
    }
    if (reply.length === 0) continue
    const followedByWork = next < parts.length && !parts[next].prose
    result = clip(followedByWork ? reply[0] : reply.join(' '))
    index = next - 1
  }
  return result
}
