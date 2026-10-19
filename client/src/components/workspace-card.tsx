import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Island } from './island'
import type { Workspace } from '../types'
import { countNeedsAttention } from '../lib/status'
import { shortenPath } from '../lib/shorten-path'
import { treeCount } from '../lib/tree-count'

interface WorkspaceCardProps {
  workspace: Workspace
}

function useIslandPath(path: string) {
  const ref = useRef<HTMLDivElement>(null)
  const [label, setLabel] = useState(path)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    const apply = () => {
      if (!context) {
        setLabel(path)
        return
      }
      context.font = getComputedStyle(el).font
      setLabel(shortenPath(path, el.clientWidth, (value) => context.measureText(value).width))
    }

    apply()
    void document.fonts.ready.then(apply)
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => observer.disconnect()
  }, [path])

  return { ref, label }
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const needs = countNeedsAttention(workspace.agents)
  const topAgents = workspace.agents.filter((a) => !a.parentId).slice(0, 5)
  const pathLabel = useIslandPath(workspace.path)

  return (
    <Link
      to={`/workspace/${workspace.id}`}
      className="group relative flex flex-col items-center rounded-sm border-[3px] border-transparent px-8 py-4 outline-none transition-colors duration-75 hover:border-primary focus-visible:border-primary"
    >
      <div className="relative z-10 flex h-16 items-end justify-center gap-1">
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
        trees={treeCount(workspace.firstCommitAt)}
        camp={workspace.hasCamp}
        className="transition-transform duration-75 ease-out group-hover:-translate-y-1"
      />
      <div className="mt-3 w-64 text-center">
        <div className="on-sky font-display text-[10px] text-foreground group-hover:text-primary">
          {workspace.name}
        </div>
        <div
          ref={pathLabel.ref}
          title={workspace.path}
          className="on-sky mt-1 w-full overflow-hidden font-mono text-lg text-muted-foreground"
        >
          {pathLabel.label}
        </div>
      </div>
      {needs > 0 && (
        <div className="pixel-box mt-3 animate-pop bg-warning px-2 py-1 font-display text-[8px] text-primary-foreground">
          ? {needs} WONDERING
        </div>
      )}
    </Link>
  )
}
