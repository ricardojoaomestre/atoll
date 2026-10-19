# Atoll

Arcade-style map for local agent CLIs. Cursor (`agent`) and Claude (`claude`) each get a real terminal on a pixel island.

**For AI / coding agents:** start with [AGENTS.md](AGENTS.md) and [docs/](docs/).

Pixel islands for workspaces, robot sprites for agents, and a real xterm
panel wired to the CLI you pick in Settings.

## Requirements

- Node 20+
- Cursor CLI (`curl https://cursor.com/install -fsS | bash`) and `agent login`, or Claude CLI (`claude`)
- Pick the default in **SETTINGS**

## Setup

```bash
npm run install:all
npm run dev
```

- UI: http://127.0.0.1:5173
- API: http://127.0.0.1:8787 (bound to localhost only)

Workspaces persist to `~/.atoll/state.json`. An existing `~/.cursor-isles/state.json` is copied across on first launch.

## Usage

1. **+ NEW WORKSPACE** — name + local folder path (`~/…` ok)
2. Enter an island → **+ SPAWN AGENT** — starts the CLI chosen in Settings
3. Click an agent — open the real terminal side panel
4. **+ SUB-AGENT** / **DISMISS** — spawn a child session or kill the PTY

Status chips (`working` / `listening` / `needs-question` / `needs-permission` /
`done` / `idle`) come from PTY activity heuristics; approvals and prompts stay
in the raw terminal.

## Notes

- Uses `node-pty-prebuilt-multiarch` (plain `node-pty` failed to spawn on some
  macOS/Node 22 setups).
- Override binaries with `CURSOR_AGENT_BIN` or `CLAUDE_BIN`.
