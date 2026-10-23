# Atoll — guide for coding agents

Read this before changing the repo. Human-oriented setup stays in [README.md](README.md).

## What this project is

**Atoll** is a local-only web UI that maps a Herdr session onto a pixel-art “island” metaphor. Herdr owns the terminals and the agent status. Atoll draws them.

- **Workspaces** = Herdr workspaces. The folder under an island is the pane cwd, or the worktree checkout.
- **Agents** = Herdr agent panes. The kind (Cursor, Claude, Codex, …) comes from Herdr.
- **Docks** = Herdr tabs, shown when a workspace has more than one.
- **Focus** = `agent.focus`. The terminal stays in Herdr.

Inspired by [Agent Isles](https://agent-arcade-workspaces.lovable.app); behavior is real CLI, not mock data.

## Doc map

| Document | Use when |
| --- | --- |
| [docs/overview.md](docs/overview.md) | Product behavior, user flows, status semantics |
| [docs/structure.md](docs/structure.md) | Where files live, naming, key modules |
| [docs/architecture.md](docs/architecture.md) | API, WebSockets, PTY lifecycle, persistence |
| [docs/development.md](docs/development.md) | Install, dev servers, build, env vars |
| [docs/guardrails.md](docs/guardrails.md) | **Do not** break these — common pitfalls |
| [docs/herdr.md](docs/herdr.md) | How the island UI sits on a Herdr session |

## Quick run

```bash
npm run install:all
npm run dev
```

`make` from the repo root does the same thing and opens the browser.

- UI: http://127.0.0.1:5173  
- API: http://127.0.0.1:8787 (localhost only)  
- Requires `agent login` on the host machine.

## Stack (short)

- **Root**: npm workspaces-style scripts (`concurrently` runs client + server)
- **client/**: Vite, React 19, React Router, Tailwind 4, xterm.js
- **server/**: Fastify, `@fastify/websocket`, `node-pty-prebuilt-multiarch`

## Default agent workflow

1. Skim [docs/guardrails.md](docs/guardrails.md).
2. Make the smallest change that matches existing patterns in `client/src` and `server/src`.
3. Run `npx tsc --noEmit` in `client/` and `server/` after TypeScript edits.
4. Do not commit unless the user asks.
