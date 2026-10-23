# Guardrails (what not to do)

These rules exist because past bugs or product decisions were explicit. Future agents should treat them as hard constraints unless the user requests a deliberate change.

## Herdr

- Session state comes from the Herdr socket (`server/src/herdr/`). Do not spawn a parallel PTY for an agent Herdr already hosts.
- **Do not** paint `pane.read` snapshots into xterm. That is a log. The TUI stays in the Herdr client.
- Clicking a robot focuses the Herdr pane. Hiding the card does not close the pane. **DISMISS** closes the pane. Deleting an island closes the Herdr workspace.
- Map `blocked` to wondering. Do not guess a permission pose from `blocked` alone.
- A note is `agent.prompt`, and only for idle or done. A reply to a blocked robot is `pane.send_text` plus Enter. `agent.prompt` while blocked is refused by Herdr.
- The ship's log is a memory of transitions. The snapshot remains the status. Do not persist the log in `state.json`.
- Herdr `done` means idle and not yet seen. When Herdr reports `idle`, the robot sleeps.
- On `events_lost`, refresh from `session.snapshot`. Do not merge a partial event stream back onto a stale cache.

## HTTP / API client

- **Do not** send `Content-Type: application/json` on requests with **no body** (e.g. DELETE dismiss). Fastify returns `FST_ERR_CTP_EMPTY_JSON_BODY`. See `client/src/lib/api.ts`.

## WebSockets

- **Do not** route PTY WebSockets only through Vite proxy in dev without verifying upgrade; current fix is direct `ws://127.0.0.1:8787` in `wsUrl()` when `import.meta.env.DEV`.
- **Do not** bind the API to `0.0.0.0` or add auth bypass “for convenience” — local trust model assumes single user on localhost.

## Dependencies

- **Do not** swap back to plain `node-pty` without testing spawn on macOS arm64 + Node 22.
- **Do not** add heavy UI frameworks; stay Vite + React + Tailwind + small set of components.

## Status semantics

- **Do not** mark Herdr `blocked` as `done` or as `needs-permission`.
- **Do not** mark Herdr `idle` as `working`.
- **Do not** reset status to a fake `idle` on sprite click. Herdr owns status.

## UI / UX

- **Do not** show the island platform under the focused agent (it overlapped the header).
- **Do not** use `!` / panic raised-hands for permission; use the polite-beg pose (`OK?`). Questions keep wondering + `?`.
- **Do not** cap focused terminal width with a small `max-w-6xl`; focused mode uses full width intentionally.

## Persistence

- **Do not** store PTY output in `state.json` (size, privacy). Replay is in-memory only.
- **Do not** commit `~/.atoll/state.json` or user paths from local testing.

## Git / process

- **Do not** commit unless the user explicitly asks.
- **Do not** edit plan files in `.cursor/plans/` when the user says not to.
- Prefer minimal diffs; match existing file style (2 spaces, single quotes in TS).

## When extending

- New agent statuses: update **both** `client/src/types.ts` and `server/src/types.ts`, plus `status.ts`, sprites, and `server/src/herdr/project.ts`.
- New API routes: update `client/src/lib/api.ts` and this doc set if behavior is non-obvious.
