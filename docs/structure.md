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
│       ├── index.css     # Pixel theme and animations
│       ├── types.ts      # AgentStatus, AgentSource, Workspace, Agent
│       ├── lib/
│       │   ├── api.ts    # REST + wsUrl()
│       │   ├── events.ts # /api/events subscribe + reconnect
│       │   ├── job-line.ts # Hover dialogue copy from Herdr summary or status
│       │   ├── beach.ts    # Where each pose stands, and the crate label
│       │   ├── chart.ts    # Map bands: wave, flag, work, horizon
│       │   ├── composer.ts # Note vs reply
│       │   ├── ship-log.ts # Clock for the ship's log
│       │   └── status.ts # Labels/classes for status chips
│       ├── hooks/
│       │   └── use-workspaces.ts  # Mount/reconnect refresh + /api/events
│       ├── components/
│       │   ├── agent-dialogue.tsx # Bottom job box, note, and reply
│       │   ├── agent-composer.tsx # The note or reply field
│       │   ├── agent-sprite.tsx   # Pixel robot by status
│       │   ├── beach.tsx          # Robots placed on the sand
│       │   ├── ship-log.tsx       # Pose changes under the map
│       │   ├── agent-session.tsx  # Focused card. The terminal stays in Herdr.
│       │   ├── island.tsx
│       │   ├── workspace-card.tsx
│       │   └── new-workspace-dialog.tsx
│       └── pages/
│           ├── map-page.tsx
│           └── workspace-page.tsx   # Island, docks, zoom to the session card
└── server/
    ├── package.json
    └── src/
        ├── index.ts      # Fastify REST + /api/events
        ├── store.ts      # ~/.atoll/state.json keeps the sky and default kind
        ├── herdr/        # Socket, snapshot, spawn, focus, notes, replies, ship's log
        ├── types.ts
        └── first-commit.ts
```

## Conventions

- **ESM** everywhere (`"type": "module"` on server; Vite client).
- Server imports use `.js` extensions in TypeScript paths (NodeNext).
- Shared concepts (`AgentStatus`, shapes) are duplicated in `client/src/types.ts` and `server/src/types.ts` — keep them in sync when adding statuses.
- Pixel UI: utility classes in `index.css` (`.pixel-box`, `.pixel-btn`, animations). Tailwind 4 via `@import 'tailwindcss'`.
- Components: mostly named exports; pages are route targets.

## Persistence

- `~/.atoll/state.json` keeps the sky and the default agent kind.
- Islands and robots are the live Herdr snapshot. Restarting Atoll does not close them.

## Important client state (workspace page)

- `selectedId`: which sprite is focused. Hiding clears it. Herdr keeps the pane.
- `pinnedId`: which robot's note or reply stays open after the pointer leaves. `?mate=` sets it once.

`pty-manager.ts`, `permission-detect.ts`, `task-detect.ts`, and `server/src/cli/` are still in the tree and are not on the request path.
