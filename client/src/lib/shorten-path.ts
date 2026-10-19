const MARK = '....'

export function shortenPath(
  path: string,
  maxWidth: number,
  measure: (value: string) => number,
): string {
  const clean = path.trim()
  if (!clean || maxWidth <= 0 || measure(clean) <= maxWidth) return clean

  const absolute = clean.startsWith('/')
  const parts = clean.split('/').filter((part) => part.length > 0)
  if (parts.length === 0) return clean

  const parents = parts.length > 1 ? parts.slice(0, -1) : parts
  const parentText = join(absolute, parents)
  if (measure(parentText) <= maxWidth) return parentText

  const collapsed = collapseMiddle(absolute, parents, maxWidth, measure)
  if (collapsed) return collapsed

  return fitMiddle(parentText, maxWidth, measure)
}

function join(absolute: boolean, parts: string[]): string {
  return `${absolute ? '/' : ''}${parts.join('/')}`
}

function collapseMiddle(
  absolute: boolean,
  parts: string[],
  maxWidth: number,
  measure: (value: string) => number,
): string | null {
  if (parts.length < 2) return null

  let best: string | null = null
  let bestWidth = -1

  for (let head = 1; head < parts.length; head++) {
    for (let tail = 1; head + tail < parts.length; tail++) {
      const text = `${join(absolute, parts.slice(0, head))}/${MARK}/${parts.slice(-tail).join('/')}`
      const width = measure(text)
      if (width <= maxWidth && width > bestWidth) {
        best = text
        bestWidth = width
      }
    }
  }

  return best
}

function fitMiddle(
  value: string,
  maxWidth: number,
  measure: (value: string) => number,
): string {
  let best = MARK
  let low = 0
  let high = value.length

  while (low <= high) {
    const keep = Math.floor((low + high) / 2)
    const headLen = Math.ceil(keep / 2)
    const tailLen = Math.floor(keep / 2)
    const text = `${value.slice(0, headLen)}${MARK}${value.slice(value.length - tailLen)}`
    if (measure(text) <= maxWidth) {
      best = text
      low = keep + 1
    } else {
      high = keep - 1
    }
  }

  return best
}
