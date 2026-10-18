# Overview

## Purpose

Cursor Isles gives a visual “map → island → agent” UI for **local** Cursor Agent CLI sessions. The terminal content is the real `agent` interactive TUI over a PTY; the pixel sprites and badges are a thin layer on top.

## User flows

### Map (`/`)

- Lists persisted **workspaces** as islands (name + path).
- **+ NEW WORKSPACE**: name + filesystem path (`~` expanded server-side).
- Badge **? N WONDERING** when any agent needs a question or permission (`needs-question` or `needs-permission`).
- Delete workspace (X on card) kills PTYs and removes from state.

### Workspace (`/workspace/:id`)

- **Overview mode**: all agents on a floating island; **+ SPAWN AGENT** starts a new PTY.
- **+ SUB-AGENT** (terminal footer) starts a **real sibling PTY** (`source: 'pty'`).
- In-process CLI **Task** children appear as inferred sprites (`source: 'task'`, no PTY). Click opens the **parent** terminal and highlights the child.
- **Focused mode** (agent selected): zoom transition — ~28% large sprite, ~72% terminal; full width, minimal side padding.
- **Hide terminal**: HIDE button, **Esc**, or click the focused agent sprite → zoom back to island view; **PTY and xterm stay alive** (`openTerminalIds` keeps sessions).
- **DISMISS**: kills PTY, removes agent record, closes session.

### Terminal

- xterm.js with system monospace font — **do not** restyle agent output as pixel/VT323 log lines.
- WebSocket: `ws://127.0.0.1:8787/ws/agents/:agentId` in dev (see `client/src/lib/api.ts` `wsUrl`).
- Server replays buffered PTY output on attach.
- Hidden terminals stay mounted (`openTerminalIds`) but skip paint (`hidden` + `inert`); xterm scrollback is capped (~400 lines). Live PTY output is still written, batched on animation frames.

### Live status

- Map and workspace badges update from `/api/events`, not a 4s poll.
- REST refresh runs on mount, after mutations, and after events-socket reconnect.

## Agent status (UI only)

Statuses are **heuristics** from PTY activity, not parsed from Cursor SDK/stream-json:

| Status | Meaning |
| --- | --- |
| `working` | Agent is printing |
| `listening` | You are typing a prompt (keystrokes, no new agent output) |
| `needs-question` | Quiet ~1.5s after a conversational question (not a permission) |
| `needs-permission` | Quiet ~1.5s after an allow/deny or y/n approval prompt |
| `done` | Inferred task complete: was working, now quiet, no question/permission. Process exit also maps here. |
| `idle` | Sleep: quiet ~20s after `done` or `listening`. Also used after server restart. |

Detection lives in `server/src/permission-detect.ts` and `server/src/pty-manager.ts`.

## Task children (heuristic)

When the parent TUI mentions Task / sub-agent work, the server scans the last ~6–8k of replay (debounced ~400ms, only if the chunk looks relevant) and adds up to 8 inferred children. Status is `working` or `done` from that text; if the parent goes `idle` / `done` / exits, leftover working children become `done`. This is **not** ACP and **not** a child PTY.

## Out of scope (by design)

- Cloud agents / `@cursor/sdk`
- Parsing `agent -p --output-format stream-json` into a custom chat UI
- Multi-user or binding API to `0.0.0.0`
- `agent persist attach` (possible follow-up)
