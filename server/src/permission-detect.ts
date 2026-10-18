const ANSI_RE =
  // eslint-disable-next-line no-control-regex
  /\x1b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[()][0-9A-Za-z])/g

const PERMISSION_RE =
  /(?:\(\s*[yY]\s*\)\s*(?:es)?\s*\/\s*\(\s*[nN]\s*\)|\[[yY]\s*\/\s*[nN]\]|\by\s*\/\s*n\b|\bapprove\b|\ballow\b[\s\S]{0,80}\?|\brun this (?:command|tool)\b|\bpermission(?:s)?\b|\bwaiting for (?:your )?(?:approval|confirmation|input)\b|\bdo you want to\b|\bcontinue\?\b|\bproceed\?\b|\bconfirm\b)/i

export function stripAnsi(text: string) {
  return text.replace(ANSI_RE, '')
}

export function looksLikePermissionPrompt(text: string) {
  const recent = stripAnsi(text.slice(-8_000)).slice(-6_000)
  return PERMISSION_RE.test(recent)
}
