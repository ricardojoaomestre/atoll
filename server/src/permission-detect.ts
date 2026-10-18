const ANSI_RE =
  // eslint-disable-next-line no-control-regex
  /\x1b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[()][0-9A-Za-z])/g

const PERMISSION_RE =
  /(?:\(\s*[yY]\s*\)\s*(?:es)?\s*\/\s*\(\s*[nN]\s*\)|\[[yY]\s*\/\s*[nN]\]|\by\s*\/\s*n\b|\bapprove\b|\bdeny\b|\ballow\b|\brun this (?:command|tool)\b|\bpermission(?:s)?\b|\bwaiting for (?:your )?(?:approval|confirmation)\b)/i

const QUESTION_RE =
  /(?:\bwhich\b|\bwhat would you like\b|\bdo you want me to\b|\bshould I\b|\bchoose\b|\bpick\b|\bwhich one\b|\bhow should\b|\bwhere should\b)/i

export type PromptKind = 'permission' | 'question' | null

export function stripAnsi(text: string) {
  return text.replace(ANSI_RE, '')
}

export function classifyPrompt(text: string): PromptKind {
  const recent = stripAnsi(text.slice(-8_000)).slice(-6_000)
  if (PERMISSION_RE.test(recent)) return 'permission'
  if (QUESTION_RE.test(recent)) return 'question'
  return null
}

export function looksLikePermissionPrompt(text: string) {
  return classifyPrompt(text) === 'permission'
}
