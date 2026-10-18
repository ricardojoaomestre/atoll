# Development

## Prerequisites

- Node 20+
- Cursor CLI on PATH (typically `~/.local/bin/agent`)
- `agent login` completed once on the machine

## Install

```bash
npm run install:all
```

Installs root, `server/`, and `client/` dependencies.

## Dev

```bash
npm run dev
```

Runs concurrently:

- `server`: `tsx watch src/index.ts` on **127.0.0.1:8787**
- `client`: Vite on **127.0.0.1:5173**

Individual:

```bash
npm run dev:server
npm run dev:client
```

## Typecheck

```bash
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit
```

## Build

```bash
npm run build
```

- Client: `tsc --noEmit && vite build`
- Server: `tsc` → `server/dist/`

Production serving of the SPA behind the API is not fully wired in-repo; today the intended path is dev or custom static hosting plus API on localhost.

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `PORT` | server | API port (default `8787`) |
| `CURSOR_AGENT_BIN` | server | Override path to `agent` executable |

State file: `~/.cursor-isles/state.json` (created automatically).

## PTY package note

Use **`node-pty-prebuilt-multiarch`**, not `node-pty`. Plain `node-pty` failed with `posix_spawnp failed` on some macOS + Node 22 setups during project bootstrap.

After changing native deps:

```bash
cd server && npm rebuild node-pty-prebuilt-multiarch
```

## Manual API checks

```bash
curl -s http://127.0.0.1:8787/api/health
curl -s http://127.0.0.1:8787/api/workspaces
# DELETE must NOT send Content-Type: application/json with empty body (Fastify 400)
curl -s -X DELETE http://127.0.0.1:8787/api/workspaces/<id>/agents/<agentId>
```

## Testing in browser

Focused layout: select agent → terminal ~72% width; HIDE / Esc / click agent → island view. Confirm xterm still has history when reopening same agent.
