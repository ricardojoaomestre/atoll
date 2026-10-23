export interface ShipLogEntry {
  id: string
  at: string
  workspaceId: string
  agentId: string
  text: string
}

export function formatLogTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}
