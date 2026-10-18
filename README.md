# Cursor Isles

Arcade-style map for managing local Cursor `agent` CLI sessions.

**For AI / coding agents:** start with [AGENTS.md](AGENTS.md) and [docs/](docs/).

Pixel islands for workspaces, robot sprites for agents, and a real xterm
panel wired to interactive `agent` processes over a PTY.

## Requirements

- Node 20+
- Cursor CLI installed (`curl https://cursor.com/install -fsS | bash`)
- Logged in: `agent login`

## Setup

```bash
npm run install:all
npm run dev
```

- UI: http://127.0.0.1:5173
- API: http://127.0.0.1:8787 (bound to localhost only)

Workspaces persist to `~/.cursor-isles/state.json`.

## Usage

1. **+ NEW WORKSPACE** — name + local folder path (`~/…` ok)
2. Enter an island → **+ SPAWN AGENT** — starts `agent --workspace <path> --trust`
3. Click an agent — open the real terminal side panel
4. **+ SUB-AGENT** / **DISMISS** — spawn a child session or kill the PTY

Status chips (`working` / `listening` / `needs-question` / `needs-permission` /
`done` / `idle`) come from PTY activity heuristics; approvals and prompts stay
in the raw terminal.

## Notes

- Uses `node-pty-prebuilt-multiarch` (plain `node-pty` failed to spawn on some
  macOS/Node 22 setups).
- Override the binary with `CURSOR_AGENT_BIN=/path/to/agent`.
