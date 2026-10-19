export type Sky = 'sunrise' | 'day' | 'sunset' | 'night'

export type SkyChoice = 'auto' | Sky

const SKY_KEY = 'atoll.sky'

let choice: SkyChoice = 'auto'
const listeners = new Set<() => void>()

export function parseSkyChoice(value: unknown): SkyChoice {
  if (
    value === 'auto'
    || value === 'sunrise'
    || value === 'day'
    || value === 'sunset'
    || value === 'night'
  ) {
    return value
  }
  return 'auto'
}

function readCachedChoice(): SkyChoice {
  try {
    return parseSkyChoice(localStorage.getItem(SKY_KEY))
  } catch {
    return 'auto'
  }
}

export function skyChoice() {
  return choice
}

export function subscribeSky(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function applySky(date = new Date()) {
  document.documentElement.dataset.sky = choice === 'auto' ? skyAt(date) : choice
}

export function setSkyChoice(next: SkyChoice) {
  choice = next
  try {
    localStorage.setItem(SKY_KEY, next)
  } catch {
    /* storage can be blocked; the server setting still applies */
  }
  applySky()
  for (const listener of listeners) listener()
}

export function skyForHour(hour: number): Sky {
  if (hour >= 5 && hour < 8) return 'sunrise'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'sunset'
  return 'night'
}

export function skyAt(date = new Date()): Sky {
  return skyForHour(date.getHours())
}

export function bindSky(date = new Date()) {
  choice = readCachedChoice()
  applySky(date)
}

export function msUntilNextSky(date = new Date()) {
  const hour = date.getHours()
  const nextHour = [5, 8, 17, 20, 29].find((boundary) => boundary > hour) ?? 29
  const target = new Date(date)
  target.setMinutes(0, 0, 0)
  if (nextHour >= 24) {
    target.setDate(target.getDate() + 1)
    target.setHours(nextHour - 24)
  } else {
    target.setHours(nextHour)
  }
  return Math.max(target.getTime() - date.getTime(), 1000)
}
