import { Link } from 'react-router-dom'
import { Island } from './island'
import type { Workspace } from '../types'
import { countByStatus } from '../lib/status'

interface WorkspaceCardProps {
  workspace: Workspace
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const needs = countByStatus(workspace.agents, 'needs-input')
  const topAgents = workspace.agents.filter((a) => !a.parentId).slice(0, 5)

  return (
    <Link
      to={`/workspace/${workspace.id}`}
      className="group relative flex w-60 flex-col items-center rounded-sm border-[3px] border-transparent p-4 outline-none transition hover:border-primary focus-visible:border-primary"
    >
      <div className="relative mb-2 flex h-10 items-end justify-center gap-1">
        {topAgents.length === 0 ? (
          <span className="font-mono text-lg text-muted-foreground/40">·</span>
        ) : (
          topAgents.map((agent) => (
            <span
              key={agent.id}
              className="inline-block h-3 w-3 border border-border"
              style={{ background: `oklch(0.72 0.17 ${agent.color})` }}
              title={agent.name}
            />
          ))
        )}
      </div>
      <Island
        hue={workspace.hue}
        className="w-48 transition duration-200 group-hover:-translate-y-1 group-hover:animate-float"
      />
      <div className="mt-3 text-center">
        <div className="font-display text-[10px] text-foreground group-hover:text-primary">
          {workspace.name}
        </div>
        <div className="mt-1 max-w-[14rem] truncate font-mono text-lg text-muted-foreground">
          {workspace.path}
        </div>
      </div>
      {needs > 0 && (
        <div className="pixel-box mt-3 animate-pop bg-warning px-2 py-1 font-display text-[8px] text-primary-foreground">
          ? {needs} ASKING
        </div>
      )}
    </Link>
  )
}
