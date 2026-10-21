# Project structure

```
atoll/
├── package.json          # npm run dev | install:all | build
├── README.md             # Human quick start
├── AGENTS.md             # Entry point for AI agents
├── docs/                 # Agent-oriented deep docs
├── client/               # Vite React SPA
│   ├── index.html        # Press Start 2P / VT323 fonts
│   ├── vite.config.ts    # Proxy /api; dev WS goes direct to 8787
│   └── src/
│       ├── App.tsx       # Routes: /, /workspace/:id
│       ├── index.css     # Pixel theme, animations, xterm layout
│       ├── types.ts      # AgentStatus, AgentSource, Workspace, Agent
│       ├── lib/
│       │   ├── api.ts    # REST + wsUrl()
│       │   ├── events.ts # /api/events subscribe + reconnect
│       │   ├── job-line.ts # Hover dialogue copy from summary, task name, or status
│       │   └── status.ts # Labels/classes for status chips
│       ├── hooks/
│       │   └── use-workspaces.ts  # Mount/reconnect refresh + /api/events
│       ├── components/
│       │   ├── agent-dialogue.tsx # Bottom job box on island hover
│       │   ├── agent-sprite.tsx   # Pixel robot by status
│       │   ├── agent-terminal.tsx # xterm + WS lifecycle
│       │   ├── island.tsx
│       │   ├── workspace-card.tsx
│       │   └── new-workspace-dialog.tsx
│       └── pages/
│           ├── map-page.tsx
│           └── workspace-page.tsx   # Zoom focus layout, openTerminalIds
└── server/
    ├── package.json      # node-pty-prebuilt-multiarch (not plain node-pty)
    └── src/
        ├── index.ts      # Fastify REST + WebSocket routes
        ├── store.ts      # ~/.atoll/state.json
        ├── pty-manager.ts
        ├── permission-detect.ts
        ├── task-detect.ts   # Cursor TUI patterns, used by cli/cursor.ts
        ├── cli/             # Per-CLI binary, args, and TUI mapping
        ├── types.ts
        └── node-pty-prebuilt-multiarch.d.ts
```

## Conventions

- **ESM** everywhere (`"type": "module"` on server; Vite client).
- Server imports use `.js` extensions in TypeScript paths (NodeNext).
- Shared concepts (`AgentStatus`, shapes) are duplicated in `client/src/types.ts` and `server/src/types.ts` — keep them in sync when adding statuses.
- Pixel UI: utility classes in `index.css` (`.pixel-box`, `.pixel-btn`, animations). Tailwind 4 via `@import 'tailwindcss'`.
- Components: mostly named exports; pages are route targets.

## Persistence

- Path: `~/.atoll/state.json` (copied from `~/.cursor-isles/state.json` on first launch if the new file is missing)
- Workspaces + agent **metadata** only (name, color, parentId, source, taskKey, last known status).
- **PTY processes are in-memory**; server restart clears live sessions; store resets `working` / `listening` / `needs-question` / `needs-permission` (and legacy `needs-input`) to `idle` on load.

## Important client state (workspace page)

- `selectedId`: which sprite is highlighted (focused mode). For `source: 'task'` this is the child; the mounted terminal is still the parent.
- `openTerminalIds`: agents with a mounted `AgentTerminal` (xterm + WS). Never includes task children. Hiding only clears `selectedId`; dismiss removes from `openTerminalIds`.
