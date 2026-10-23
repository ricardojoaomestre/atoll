import type { AgentStatus } from '../types'

export interface BeachSpot {
  left: number
  bottom: number
  pace: boolean
  shore: boolean
  delay: string
}

const LANES: Record<AgentStatus, { left: number; bottom: number; pace: boolean; shore: boolean }> = {
  idle: { left: 22, bottom: 108, pace: false, shore: false },
  listening: { left: 34, bottom: 100, pace: false, shore: false },
  working: { left: 48, bottom: 88, pace: true, shore: false },
  done: { left: 74, bottom: 104, pace: false, shore: false },
  'needs-question': { left: 40, bottom: 48, pace: false, shore: true },
  'needs-permission': { left: 62, bottom: 48, pace: false, shore: true },
  unknown: { left: 56, bottom: 92, pace: false, shore: false },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function beachSpots(agents: { id: string; status: AgentStatus }[]) {
  const groups = new Map<AgentStatus, string[]>()
  for (const agent of agents) {
    const list = groups.get(agent.status) ?? []
    list.push(agent.id)
    groups.set(agent.status, list)
  }

  const spots = new Map<string, BeachSpot>()
  for (const [status, ids] of groups) {
    const lane = LANES[status]
    const span = Math.min(26, 12 * Math.max(ids.length - 1, 0))
    ids.forEach((id, index) => {
      const offset = ids.length === 1 ? 0 : -span / 2 + (span * index) / (ids.length - 1)
      spots.set(id, {
        left: clamp(lane.left + offset, 8, 90),
        bottom: lane.bottom,
        pace: lane.pace,
        shore: lane.shore,
        delay: `${index * 0.4}s`,
      })
    })
  }
  return spots
}

export function crateLabel(summary: string | undefined) {
  const text = summary?.trim()
  if (!text) return ''
  return text.length > 16 ? `${text.slice(0, 15)}…` : text
}
