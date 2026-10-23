import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { expandHome, getSettings, loadState, parseAgentKind, parseSkyChoice, updateSettings } from './store.js'
import { firstCommitAt } from './first-commit.js'
import { hasPushedToOrigin } from './origin.js'
import { pickFolder } from './pick-folder.js'
import { readSpeech } from './herdr/speech.js'
import { HerdrError } from './herdr/socket.js'
import { herdrSession } from './herdr/session.js'
import type { ProjectedWorkspace } from './herdr/project.js'

const HOST = '127.0.0.1'
const PORT = Number(process.env.PORT ?? 8787)
const KIND = /^[a-z][a-z0-9_-]{0,31}$/
const FALLBACK_KINDS = ['claude', 'codex', 'cursor', 'gemini', 'opencode']

const scenery = new Map<string, Promise<{ firstCommitAt: string | null; hasCamp: boolean }>>()

function sceneryFor(path: string) {
  if (!path) return Promise.resolve({ firstCommitAt: null, hasCamp: false })
  let pending = scenery.get(path)
  if (!pending) {
    pending = Promise.all([firstCommitAt(path), hasPushedToOrigin(path)]).then(
      ([firstCommitAtValue, hasCamp]) => ({
        firstCommitAt: firstCommitAtValue,
        hasCamp,
      }),
    )
    scenery.set(path, pending)
  }
  return pending
}

async function present(workspace: ProjectedWorkspace) {
  const scene = await sceneryFor(workspace.path)
  return { ...workspace, ...scene }
}

function offline(reply: { code: (status: number) => { send: (body: unknown) => unknown } }) {
  return reply.code(503).send({
    error: herdrSession.offlineError || 'Herdr is not running. Start it with herdr, then reload.',
  })
}

function herdrFailure(err: unknown, reply: { code: (status: number) => { send: (body: unknown) => unknown } }) {
  if (err instanceof HerdrError && (err.code === 'offline' || err.code === 'connect')) {
    return offline(reply)
  }
  const message = err instanceof Error ? err.message : 'Herdr request failed'
  const status = err instanceof HerdrError && err.code === 'not_found' ? 404 : 400
  return reply.code(status).send({ error: message })
}

function taskFrom(value: unknown): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof value !== 'string' || !value.trim()) {
    return { ok: false, error: 'Write the task first.' }
  }
  const text = readSpeech(value)
  if (!text) return { ok: false, error: 'That task is too long.' }
  return { ok: true, text }
}

async function kindChoices(selected: string) {
  let kinds = FALLBACK_KINDS
  try {
    const reported = await herdrSession.kinds()
    if (reported.length > 0) kinds = reported
  } catch {
    kinds = FALLBACK_KINDS
  }
  const options = [...new Set([selected, ...kinds])].sort((a, b) => a.localeCompare(b))
  return options.map((id) => ({
    id,
    label: id.toUpperCase(),
    command: `herdr · ${id}`,
    available: kinds.includes(id),
    bin: kinds.includes(id) ? 'herdr' : null,
  }))
}

async function main() {
  await loadState()
  await herdrSession.start()

  const app = Fastify({ logger: { level: 'warn' } })
  await app.register(cors, { origin: true })
  await app.register(websocket)

  app.get('/api/health', async () => ({
    ok: true,
    herdr: herdrSession.connected(),
  }))

  app.get('/api/settings', async () => {
    const settings = getSettings()
    return { ...settings, options: await kindChoices(settings.cli) }
  })

  app.put<{ Body: { cli?: unknown; sky?: unknown } }>('/api/settings', async (req, reply) => {
    const cli = req.body?.cli
    const sky = req.body?.sky
    if (cli !== undefined && (typeof cli !== 'string' || !KIND.test(cli))) {
      return reply.code(400).send({ error: 'cli must be a Herdr agent kind' })
    }
    if (
      sky !== undefined
      && sky !== 'auto'
      && sky !== 'sunrise'
      && sky !== 'day'
      && sky !== 'sunset'
      && sky !== 'night'
    ) {
      return reply.code(400).send({ error: 'sky must be auto, sunrise, day, sunset, or night' })
    }
    if (cli === undefined && sky === undefined) {
      return reply.code(400).send({ error: 'cli or sky is required' })
    }
    const saved = await updateSettings({
      cli: cli === undefined ? undefined : parseAgentKind(cli),
      sky: sky === undefined ? undefined : parseSkyChoice(sky),
    })
    return { ...saved, options: await kindChoices(saved.cli) }
  })

  app.post('/api/pick-folder', async (_req, reply) => {
    try {
      const path = await pickFolder()
      return { path }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not open folder picker'
      return reply.code(400).send({ error: message })
    }
  })

  app.get('/api/workspaces', async (_req, reply) => {
    if (!herdrSession.connected()) return offline(reply)
    return Promise.all(herdrSession.list().map((workspace) => present(workspace)))
  })

  app.post<{
    Body: { name?: string; path?: string }
  }>('/api/workspaces', async (req, reply) => {
    const name = req.body?.name?.trim()
    const path = req.body?.path?.trim()
    if (!name || !path) {
      return reply.code(400).send({ error: 'name and path are required' })
    }
    const absolute = expandHome(path)
    try {
      await access(absolute, constants.R_OK)
    } catch {
      return reply.code(400).send({ error: `path not readable: ${absolute}` })
    }
    try {
      const workspace = await herdrSession.createWorkspace(name, absolute)
      return present(workspace)
    } catch (err) {
      return herdrFailure(err, reply)
    }
  })

  app.delete<{
    Params: { id: string }
  }>('/api/workspaces/:id', async (req, reply) => {
    try {
      const removed = await herdrSession.closeWorkspace(req.params.id)
      if (!removed) return reply.code(404).send({ error: 'not found' })
      return { ok: true }
    } catch (err) {
      return herdrFailure(err, reply)
    }
  })

  app.get<{
    Params: { id: string }
  }>('/api/workspaces/:id', async (req, reply) => {
    if (!herdrSession.connected()) return offline(reply)
    const workspace = herdrSession.get(req.params.id)
    if (!workspace) return reply.code(404).send({ error: 'not found' })
    return present(workspace)
  })

  app.get<{
    Params: { id: string }
  }>('/api/workspaces/:id/agents', async (req, reply) => {
    if (!herdrSession.connected()) return offline(reply)
    const workspace = herdrSession.get(req.params.id)
    if (!workspace) return reply.code(404).send({ error: 'not found' })
    return workspace.agents
  })

  app.post<{
    Params: { id: string }
    Body: { name?: string; kind?: string; task?: string }
  }>('/api/workspaces/:id/agents', async (req, reply) => {
    const requested = req.body?.kind ?? getSettings().cli
    const kind = parseAgentKind(requested)
    if (!KIND.test(kind)) {
      return reply.code(400).send({ error: 'kind must be a Herdr agent kind' })
    }
    const task = taskFrom(req.body?.task)
    if (!task.ok) return reply.code(400).send({ error: task.error })
    try {
      return await herdrSession.spawnAgent(req.params.id, kind, task.text)
    } catch (err) {
      return herdrFailure(err, reply)
    }
  })

  app.post<{
    Params: { id: string; agentId: string }
    Body: { name?: string; kind?: string; task?: string }
  }>('/api/workspaces/:id/agents/:agentId/sub', async (req, reply) => {
    const kind = parseAgentKind(req.body?.kind ?? getSettings().cli)
    const task = taskFrom(req.body?.task)
    if (!task.ok) return reply.code(400).send({ error: task.error })
    try {
      return await herdrSession.spawnAgent(req.params.id, kind, task.text)
    } catch (err) {
      return herdrFailure(err, reply)
    }
  })

  app.get('/api/log', async () => herdrSession.log())

  app.post<{
    Params: { id: string; agentId: string }
    Body: { text?: unknown }
  }>('/api/workspaces/:id/agents/:agentId/prompt', async (req, reply) => {
    const text = readSpeech(req.body?.text)
    if (!text) return reply.code(400).send({ error: 'Write something first.' })
    try {
      const sent = await herdrSession.promptAgent(req.params.id, req.params.agentId, text)
      if (!sent) return reply.code(404).send({ error: 'not found' })
      return { ok: true }
    } catch (err) {
      return herdrFailure(err, reply)
    }
  })

  app.post<{
    Params: { id: string; agentId: string }
    Body: { text?: unknown }
  }>('/api/workspaces/:id/agents/:agentId/answer', async (req, reply) => {
    const text = readSpeech(req.body?.text)
    if (!text) return reply.code(400).send({ error: 'Write something first.' })
    try {
      const sent = await herdrSession.answerAgent(req.params.id, req.params.agentId, text)
      if (!sent) return reply.code(404).send({ error: 'not found' })
      return { ok: true }
    } catch (err) {
      return herdrFailure(err, reply)
    }
  })

  app.post<{
    Params: { id: string; agentId: string }
  }>('/api/workspaces/:id/agents/:agentId/focus', async (req, reply) => {
    try {
      const focused = await herdrSession.focusAgent(req.params.id, req.params.agentId)
      if (!focused) return reply.code(404).send({ error: 'not found' })
      return { ok: true }
    } catch (err) {
      return herdrFailure(err, reply)
    }
  })

  app.delete<{
    Params: { id: string; agentId: string }
  }>('/api/workspaces/:id/agents/:agentId', async (req, reply) => {
    try {
      const removed = await herdrSession.dismissAgent(req.params.id, req.params.agentId)
      if (!removed) return reply.code(404).send({ error: 'not found' })
      return { ok: true }
    } catch (err) {
      return herdrFailure(err, reply)
    }
  })

  app.get('/api/events', { websocket: true }, (socket) => {
    const onSync = () => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'sync' }))
      }
    }
    herdrSession.on('sync', onSync)
    socket.on('close', () => {
      herdrSession.off('sync', onSync)
    })
  })

  await app.listen({ host: HOST, port: PORT })
  console.log(`atoll api on http://${HOST}:${PORT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
