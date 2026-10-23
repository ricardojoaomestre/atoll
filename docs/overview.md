# Overview

## Purpose

Atoll gives a visual “map → island → agent” UI for the Herdr session already running on this machine. Herdr owns every pane, every CLI, and the status of each agent. The sprites are a thin layer on that snapshot.

## User flows

### Map (`/`)

- Lists persisted **workspaces** as islands (name + path).
- **+ NEW WORKSPACE**: name + filesystem path (`~` expanded server-side).
- Islands drift by urgency. Wondering islands sit in front, larger. Unseen `done` carries a **✓ N DONE** flag. Sleeping islands sit smaller, toward the horizon.
- Badge **? N WONDERING** is a link to that robot’s reply. **N** or **N · NEXT WAVE** does the same for the first one on the chart.
- **SHIP'S LOG** at the bottom records pose changes after Atoll has seen a snapshot. Click a line to open that robot. The first snapshot stays blank.
- Delete workspace (X on card) closes the Herdr workspace.

### Workspace (`/workspace/:id`)

- **Overview mode**: agents on a beach, grouped into docks when the Herdr workspace has more than one tab. Sleepers stand inland, workers pace with a crate, blocked robots stand in the surf, and a finished robot holds the check up on the grass. **+ SPAWN AGENT** starts the default kind in a free shell pane, or splits one first.
- Hover or keyboard-focus a worker to read its current job in a dialogue at the bottom of the page. The line is Herdr’s summary token, title, or stripped terminal title. A sleeping or finished robot keeps a note box (`agent.prompt`). A wondering robot keeps a reply box (`pane.send_text`, then Enter). The box hides in focused mode. **N** cycles wondering robots on this island.
- **+ ANOTHER** starts another agent of the default kind on the same island.
- **Focused mode** (agent selected): zoom transition — large sprite beside a session card. Opening the card calls `agent.focus`, so the real terminal is the Herdr pane.
- **HIDE**, **Esc**, or a click on the focused sprite zooms back. The Herdr pane keeps running.
- **DISMISS**: closes that Herdr pane.

### Session card

The focused card shows the kind, folder, dock, and job line, plus the same note or reply box. It does not embed the CLI. Herdr’s public socket reads panes as snapshots, and a snapshot is not a TUI.

### Live status

- Map and workspace badges update from `/api/events`. Herdr lifecycle and `pane.agent_status_changed` events invalidate the snapshot, and the server sends `{ "type": "sync" }`.
- REST refresh runs on mount, after mutations, on `sync`, and after the events socket reconnects.

## Agent status (UI only)

Statuses come from Herdr. `server/src/herdr/project.ts` maps them:

| Herdr | Atoll | Sprite |
| --- | --- | --- |
| `working` | `working` | Gear |
| `idle` | `idle` | Sleep |
| `blocked` | `needs-question` | Wondering `?` |
| `done` | `done` | Check, until Herdr marks the pane seen and reports `idle` |
| `unknown` | `unknown` | Plain robot, label SETTLING |

`blocked` covers a question and a permission. The dialogue shows Herdr’s message. The pose stays wondering.

`listening` and `needs-permission` remain in the sprite code. Herdr does not emit them.

## What is a robot

A robot is a Herdr pane whose `agent` field is set. A shell pane is empty sand. In-TUI Task children that never get their own pane stay inside that robot.

## Out of scope (by design)

- Owning a second PTY beside Herdr
- Painting `pane.read` snapshots into xterm
- Cloud agents / `@cursor/sdk`
- Multi-user or binding API to `0.0.0.0`
- Named Herdr sessions other than the default socket (`HERDR_SOCKET_PATH` overrides it)
