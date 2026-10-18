# Project structure

```
cursor-isles/
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
│       ├── types.ts      # AgentStatus, Workspace, Agent
│       ├── lib/
│       │   ├── api.ts    # REST + wsUrl()
│       │   ├── events.ts # /api/events subscribe + reconnect
│       │   └── status.ts # Labels/classes for status chips
│       ├── hooks/
│       │   └── use-workspaces.ts  # Mount/reconnect refresh + /api/events
│       ├── components/
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
        ├── store.ts      # ~/.cursor-isles/state.json
        ├── pty-manager.ts
        ├── permission-detect.ts
        ├── agent-bin.ts  # Resolve agent binary
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

- Path: `~/.cursor-isles/state.json`
- Workspaces + agent **metadata** only (name, color, parentId, last known status).
- **PTY processes are in-memory**; server restart clears live sessions; store resets `working` / `listening` / `needs-input` to `idle` on load.

## Important client state (workspace page)

- `selectedId`: which agent’s terminal panel is visible (focused mode).
- `openTerminalIds`: agents with an mounted `AgentTerminal` (xterm + WS). Hiding only clears `selectedId`; dismiss removes from `openTerminalIds`.
