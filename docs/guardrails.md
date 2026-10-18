# Guardrails (what not to do)

These rules exist because past bugs or product decisions were explicit. Future agents should treat them as hard constraints unless the user requests a deliberate change.

## Terminal and CLI

- **Do not** replace the xterm panel with a fake log UI that parses agent output for display. Approvals, colors, and TUI widgets must stay native in xterm.
- **Do not** use `agent -p` / `stream-json` for the main interactive session unless the product scope changes entirely.
- **Do not** destroy the xterm WebSocket or PTY when the user **hides** the terminal. Only **DISMISS**, workspace delete, or process exit should kill sessions.
- **Do not** unmount `AgentTerminal` on hide — use `visible` + keep `openTerminalIds` so replay and live PTY stay connected.

## HTTP / API client

- **Do not** send `Content-Type: application/json` on requests with **no body** (e.g. DELETE dismiss). Fastify returns `FST_ERR_CTP_EMPTY_JSON_BODY`. See `client/src/lib/api.ts`.

## WebSockets

- **Do not** route PTY WebSockets only through Vite proxy in dev without verifying upgrade; current fix is direct `ws://127.0.0.1:8787` in `wsUrl()` when `import.meta.env.DEV`.
- **Do not** bind the API to `0.0.0.0` or add auth bypass “for convenience” — local trust model assumes single user on localhost.

## Dependencies

- **Do not** swap back to plain `node-pty` without testing spawn on macOS arm64 + Node 22.
- **Do not** add heavy UI frameworks; stay Vite + React + Tailwind + small set of components.

## Status semantics

- **Do not** mark permission waits as `done` / green check. Use `needs-input` + wondering sprite when `permission-detect.ts` matches.
- **Do not** mark idle-at-prompt as `working`. Use `listening` after the idle timeout when no permission pattern.
- **Do not** reset status to fake `idle` on sprite click in the client; server/PTY owns status (removed behavior — keep it that way).

## UI / UX

- **Do not** show the island platform under the focused agent (it overlapped the header).
- **Do not** use `!` / panic raised-hands for permission; use wondering pose + `?` bubble.
- **Do not** cap focused terminal width with a small `max-w-6xl`; focused mode uses full width intentionally.

## Persistence

- **Do not** store PTY output in `state.json` (size, privacy). Replay is in-memory only.
- **Do not** commit `~/.cursor-isles/state.json` or user paths from local testing.

## Git / process

- **Do not** commit unless the user explicitly asks.
- **Do not** edit plan files in `.cursor/plans/` when the user says not to.
- Prefer minimal diffs; match existing file style (2 spaces, single quotes in TS).

## When extending

- New agent statuses: update **both** `client/src/types.ts` and `server/src/types.ts`, plus `status.ts`, sprites, and pty-manager logic.
- New API routes: update `client/src/lib/api.ts` and this doc set if behavior is non-obvious.
