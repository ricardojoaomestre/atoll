<p align="center">
  <a href="docs/demo.mp4">
    <img src="docs/demo.webp" alt="Atoll demo: sunset islands, robots on the beach, and a live terminal" width="960">
  </a>
</p>

<h1 align="center">Atoll</h1>

<p align="center">
  A pixel sea for the agents already on your machine.<br>
  Folders become islands. Sessions become robots.<br>
  The panel beside them is the real CLI.
</p>

<p align="center">
  <a href="docs/demo.mp4"><img alt="Watch the demo" src="https://img.shields.io/badge/watch-the%20demo-f8d048?style=flat-square&labelColor=1a1020"></a>
  &nbsp;
  <img alt="Local only" src="https://img.shields.io/badge/local-only-3dd6c6?style=flat-square&labelColor=1a1020">
  &nbsp;
  <img alt="Node 20 or newer" src="https://img.shields.io/badge/node-20%2B-5adf7a?style=flat-square&labelColor=1a1020">
</p>

The picture above is a short tour. Click it for the video file.

## Cast off

```bash
make
```

That installs dependencies, starts Atoll, and opens it in your browser. The API listens on this machine only.

| | Address |
| --- | --- |
| UI | http://127.0.0.1:5173 |
| API | http://127.0.0.1:8787 |

You need **Node 20+**, and a CLI you have already logged into: Cursor (`agent`) or Claude (`claude`). Pick the default under **SETTINGS**.

<details>
<summary>The same steps without Make</summary>

```bash
npm run install:all
npm run dev
```

Then open http://127.0.0.1:5173.

</details>

## What you are looking at

| | |
| --- | --- |
| **Islands** | A workspace is a folder on disk. The map is every folder you have docked. |
| **Robots** | Each sprite is a live session. Spawn one, or a smaller one beside it. |
| **Terminal** | xterm, wired to that session. Questions, permissions, and color stay in the CLI. Hide the panel and the session keeps running. |

## A short voyage

1. **+ NEW WORKSPACE** — name the island and point it at a folder. `~/…` is fine.
2. Open the island and press **+ SPAWN AGENT**. It starts the CLI you chose in Settings.
3. Click a robot. The terminal fills the right of the screen. **HIDE**, Esc, or a click on the sprite returns you to the beach.
4. **+ SUB-AGENT** starts another session. **DISMISS** ends one.

When an agent is waiting on you, the map shows **? N WONDERING**. You answer in the terminal.

## How a robot stands

| | Status | Meaning |
| --- | --- | --- |
| ⚙ | `working` | The agent is printing |
| ··· | `listening` | You are typing |
| ? | `needs-question` | It asked something, then went quiet |
| OK? | `needs-permission` | It is waiting for an allow / deny |
| ✓ | `done` | The work went quiet, or the process exited |
| z | `idle` | Asleep after a longer silence |

Statuses come from terminal activity.

## Under the hull

Islands are remembered in `~/.atoll/state.json`. If `~/.cursor-isles/state.json` is still around, it is copied across on the first launch.

| Variable | What it changes |
| --- | --- |
| `PORT` | API port. Default `8787`. |
| `CURSOR_AGENT_BIN` | Path to the Cursor `agent` binary |
| `CLAUDE_BIN` | Path to `claude` |

Sessions run through `node-pty-prebuilt-multiarch`.

Behavior, layout, and the rules for changing this repo live in [docs/](docs/). Coding agents should start at [AGENTS.md](AGENTS.md).
