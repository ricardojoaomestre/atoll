# Atoll on Herdr

Atoll is a picture of the default Herdr session. The socket client lives in `server/src/herdr/`. Islands are workspaces, docks are tabs, robots are agent panes. Status, spawn, focus, and dismiss go through that socket.

`HERDR_SOCKET_PATH` overrides `~/.config/herdr/herdr.sock`.

A live snapshot of the default session, taken while this note was written, is one workspace:

| Herdr field | Value |
| --- | --- |
| Workspace | `w5`, label `atoll`, rollup `working` |
| Tab | `w5:t1`, one pane |
| Pane | `w5:p1`, agent `cursor`, status `working` |
| cwd | `/Users/ricardomestre/projects/atoll` |
| Title | `Herdr Project UI - ⏳ Working ...` |
| Session | `herdr:cursor` id `3d8ba7b2-61b8-421c-bce9-50270af4bdbf` |

That row is already an island with one robot. Atoll currently invents the same facts by spawning its own PTY and guessing from the bytes.

## What to take

Herdr already owns the parts Atoll reimplements badly, and the parts Atoll cannot see.

| Atoll today | Herdr already has | Worth taking |
| --- | --- | --- |
| Status guessed from quiet time in the PTY (`permission-detect.ts`, `pty-manager.ts`) | Semantic status from detection manifests, or from the agent’s own `pane.report_agent` | High. `working`, `idle`, `blocked`, and `done` arrive as events. |
| Two CLIs, `cursor` and `claude`, each with its own spawn adapter | `agent start --kind` for cursor, claude, codex, gemini, and many others | High. Settings becomes a kind, and the adapter list can go away. |
| Sessions die when the Atoll server restarts. `state.json` keeps metadata and resets live statuses to `idle` | Persistent session, resume command, `agent_session` id | High. Restarting the web UI leaves the robots where they are. |
| One folder equals one workspace. Agents are a flat list with an optional `parentId` | Workspace, tab, pane, worktree, cwd, foreground cwd | High for the map. A workspace is the island. An agent pane is the robot. |
| `/api/events` after Atoll notices a PTY chunk | `events.subscribe` for workspace, tab, pane, and `pane.agent_status_changed` | High. The map can follow the socket and drop the heuristic timers. |
| Hover dialogue scraped from replay (`job-line.ts`) | `terminal_title_stripped`, metadata tokens, `state_labels` | Medium. The title is a ready-made job line. Tokens can carry a cleaner one. |
| `+ SPAWN AGENT` runs `agent` or `claude` in a PTY Atoll owns | `workspace create --cwd --label`, `pane split`, `agent start --kind --pane` | Medium. Spawn stays in the UI and the process lives in Herdr. |
| Map badge `? N WONDERING` | Workspace and tab `agent_status` rollups, plus per-pane status | Medium. Count `blocked` panes. The rollup is one word and hides how many are waiting. |
| Localhost only | Local socket, plus `herdr --machine` for saved SSH hosts | Later. The browser still talks to `127.0.0.1`. Herdr is the one that reaches other machines. |

The socket is the same surface the CLI uses. `herdr api snapshot` returns the whole session in one JSON object. A small client on the Atoll server can project that into the shapes the React app already renders.

Herdr is AGPL-3.0-or-later or commercial. Atoll should shell out or speak the socket. It should not vendor Herdr source.

## What to leave with Herdr

The public JSON API reads terminals as snapshots (`pane.read` / `agent.read` with `visible`, `recent`, `recent-unwrapped`, `detection`) and writes them as text or keys (`pane.send_text`, `pane.send_keys`, `agent.prompt`). A faithful xterm needs the byte stream. That stream lives on Herdr’s numbered binary attach protocol, which the docs reserve for same-install and internal use.

So the first integration keeps the terminal in the Herdr client:

- Clicking a robot calls `agent focus` and zooms the sprite.
- The page shows the title, the status, and a short `recent` snapshot as a caption.
- Hiding the panel is only a camera move. Herdr never had its process tied to the xterm mount.

Pulling `recent` into xterm on a timer would look like a terminal and behave like a log. Approvals, full-screen TUIs, and cursor addressing need the binary attach, and that is a later experiment with an explicit version pin.

In-TUI Task children stay an Atoll heuristic. Herdr’s agent is the process that owns the pane. A Cursor Task that never gets its own pane is still invisible to `agent.list`. `task-detect.ts` remains useful only while those children matter on the beach. Sibling panes Herdr already lists should be drawn as their own robots, and the inferred-sprite path should ignore them.

`listening` has no Herdr equivalent. Herdr’s `idle` means the agent is ready for input. Atoll’s `listening` means the human is mid-keystroke. The sleep pose covers `idle`. A typing pose needs input observation Atoll only has because it owns the PTY.

## Status on the sprites

Herdr’s five statuses land on the existing poses with two traps.

| Herdr | Sprite | Why |
| --- | --- | --- |
| `working` | gear, `WORKING` | Direct match. |
| `idle` | sleep, `SLEEPING` | Ready for a prompt. This is also where a seen `done` ends up. |
| `blocked` | wondering `?`, `WONDERING` | One status covers a question and a permission. The dialogue shows Herdr’s block message. A later pass can run the existing permission classifier on that message and switch the pose to `OK?`. Guessing `MAY I?` from `blocked` alone would mark questions as approvals. |
| `done` | check, `TASK DONE` | Herdr `done` means idle and not yet seen. It is an attention flag. Once the pane is seen it becomes `idle` and the robot should sleep. Atoll’s old `done` meant “went quiet after work” and then slept 20s later. Follow Herdr’s transition, then sleep. |
| `unknown` | dim robot, no badge | Detection has not settled. Leave it off the wondering count. |

Workspace rollup on the snapshot is a single `agent_status` (`working` on `w5` right now). The map badge counts panes whose status is `blocked`. Unseen `done` can be a second, quieter mark. It should not share the `?` badge.

## Islands and robots

```text
Herdr session
  workspace  w5  "atoll"          →  one island on the map
    tab      w5:t1                →  a dock on that island, shown when the workspace has more than one tab
      pane   w5:p1  agent cursor  →  a robot
      pane   (shell, no agent)    →  nothing on the beach
    cwd / foreground_cwd          →  the path under the island name
    worktree, when present        →  same path, from worktree provenance
```

Visual extras stay Atoll’s, derived the way they are now:

- Island hue and robot color are stable hashes of the workspace id and the agent kind. Herdr has no color.
- Tree count still comes from the first commit of the pane cwd.
- The camp still means that cwd has been pushed to `origin`.

The map lists every workspace from `session.snapshot`. `+ NEW WORKSPACE` calls `workspace create --label <name> --cwd <path> --no-focus`. Herdr creates the first tab and root pane. The folder is the pane cwd, which matches “a workspace is a folder” closely enough for the card. `worktree create` is the later path for a branch that should be its own island.

On the island, one robot per entry in `snapshot.agents` whose `workspace_id` matches. Shell panes stay off the sand. A second tab is a dock that filters the beach. The default dock shows every agent in the workspace, because the overview is “who is on this island”, and Herdr’s focused tab is only who has the keyboard.

Robot name is `display_agent`, then the agent kind (`cursor`). The hover line is the metadata `summary` token when a reporter set one, otherwise `terminal_title_stripped`. The live title above is already a usable line.

Spawn on the island:

1. If the workspace has a free shell pane, `agent start <name> --kind <kind> --pane <id>`.
2. Otherwise `pane split`, then start in the new pane.

`agent start` refuses a pane that is already running something. Dismiss closes that pane. Closing the last pane can close the workspace only from the map’s delete control. Release-back-to-shell is a different action and can wait.

Sub-agent in the footer becomes “split a pane and start another kind”. The small sprite beside a parent was an Atoll invention. Herdr’s topology is neighbors in a tab. Draw them as separate robots on the same beach. Keep a smaller scale only when we still infer an in-TUI Task child.

Click focuses the pane in Herdr and selects the sprite. The session keeps running when the browser tab closes.

## Shape of the change

The React routes stay `/` and `/workspace/:id`. The server stops being a PTY owner and becomes a projection of the Herdr socket.

```text
Browser  →  Atoll REST + /api/events   (unchanged to the pages)
Atoll    →  Unix socket NDJSON          session.snapshot, events.subscribe,
                                         workspace.create, agent.start,
                                         agent.focus, pane.close
Herdr    →  the real panes and agents
```

On `events_lost`, drop the cache, resubscribe, and replace it from a fresh snapshot. Events invalidate. They are not a second source of truth to merge blindly.

`~/.atoll/state.json` stops storing the agent list. Herdr is that list. The file can keep sky settings and any sprite position we still want across reloads. Hue, trees, and camp are computed.

`server/src/cli/*`, `pty-manager.ts`, `permission-detect.ts`, and the PTY websocket stay in the tree until the Herdr projection covers spawn, status, and dismiss. After that they are the fallback for a machine with no Herdr socket, or they go away. A health check is `herdr status --json` and a missing socket. The UI can say the sea is empty because Herdr is not running.

## What the server does

`session.snapshot` plus workspace, tab, and pane events, including `pane.agent_status_changed` for each live pane. The browser refetches on `{ "type": "sync" }`.

Spawn uses a free shell pane or `pane.split`, then `agent.start` with the kind from Settings. Click calls `agent.focus`. A note calls `agent.prompt` for idle or done. A reply to a blocked robot calls `pane.send_text`, then Enter. Dismiss calls `pane.close`. Deleting an island calls `workspace.close`.

The binary attach protocol is still the only way to put the real CLI back in the page, and it is the piece most likely to break across Herdr versions.

## Benefit, in one pass

The island picture gains a runtime that already knows who is working, who is blocked, which folder they stand in, and which process will still be there after Atoll restarts. The kinds multiply without new adapters. The wondering badge becomes a count Herdr is already computing per pane.

The terminal panel gains nothing from the JSON API. Leave it in Herdr, and let the robots point at it.
