const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function treeCount(firstCommitAt: string | null | undefined, now = Date.now()): number {
  if (!firstCommitAt) return 1
  const started = Date.parse(firstCommitAt)
  if (Number.isNaN(started)) return 1
  const progress = Math.min(1, Math.max(0, (now - started) / WEEK_MS))
  return 1 + Math.floor(progress * 3)
}
