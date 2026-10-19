import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import {
  addAgent,
  createWorkspace,
  deleteWorkspace,
  expandHome,
  getAgent,
  getSettings,
  getWorkspace,
  listWorkspaces,
  loadState,
  removeAgent,
  setCli,
} from './store.js'
import { listCliChoices, parseCliId } from './cli/index.js'
import { ptyManager } from './pty-manager.js'
import { firstCommitAt } from './first-commit.js'
import { hasPushedToOrigin } from './origin.js'
import { pickFolder } from './pick-folder.js'
import type { WorkspaceRecord } from './types.js'

const HOST = '127.0.0.1'
const PORT = Number(process.env.PORT ?? 8787)

async function presentWorkspace(workspace: WorkspaceRecord) {
  const [firstCommit, hasCamp] = await Promise.all([
    firstCommitAt(workspace.path),
    hasPushedToOrigin(workspace.path),
  ])
  return {
    ...workspace,
    firstCommitAt: firstCommit,
    hasCamp,
    agents: workspace.agents.map((agent) => ({
      ...agent,
      status: ptyManager.getSession(agent.id)?.status ?? agent.status,
    })),
  }
}

async function main() {
  await loadState()
  await ptyManager.retireSettledTaskChildren()

  const app = Fastify({ logger: { level: 'warn' } })
  await app.register(cors, { origin: true })
  await app.register(websocket)

  app.get('/api/health', async () => ({ ok: true }))

  app.get('/api/settings', async () => ({
    ...getSettings(),
    options: listCliChoices(),
  }))

  app.put<{ Body: { cli?: unknown } }>('/api/settings', async (req, reply) => {
    const cli = req.body?.cli
    if (cli !== 'cursor' && cli !== 'claude') {
      return reply.code(400).send({ error: 'cli must be cursor or claude' })
    }
    return { ...await setCli(parseCliId(cli)), options: listCliChoices() }
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

  app.get('/api/workspaces', async () => {
    const workspaces = await listWorkspaces()
    return Promise.all(workspaces.map((ws) => presentWorkspace(ws)))
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
    const workspace = await createWorkspace(name, absolute)
    return presentWorkspace(workspace)
  })

  app.delete<{
    Params: { id: string }
  }>('/api/workspaces/:id', async (req, reply) => {
    ptyManager.killWorkspace(req.params.id)
    const removed = await deleteWorkspace(req.params.id)
    if (!removed) return reply.code(404).send({ error: 'not found' })
    return { ok: true }
  })

  app.get<{
    Params: { id: string }
  }>('/api/workspaces/:id', async (req, reply) => {
    const workspace = await getWorkspace(req.params.id)
    if (!workspace) return reply.code(404).send({ error: 'not found' })
    return presentWorkspace(workspace)
  })

  app.get<{
    Params: { id: string }
  }>('/api/workspaces/:id/agents', async (req, reply) => {
    const workspace = await getWorkspace(req.params.id)
    if (!workspace) return reply.code(404).send({ error: 'not found' })
    return workspace.agents.map((agent) => ({
      ...agent,
      status: ptyManager.getSession(agent.id)?.status ?? agent.status,
    }))
  })

  app.post<{
    Params: { id: string }
    Body: { name?: string }
  }>('/api/workspaces/:id/agents', async (req, reply) => {
    const workspace = await getWorkspace(req.params.id)
    if (!workspace) return reply.code(404).send({ error: 'not found' })

    const agent = await addAgent(workspace.id, { name: req.body?.name })
    if (!agent) return reply.code(500).send({ error: 'failed to create agent' })

    try {
      ptyManager.spawn({
        agentId: agent.id,
        workspaceId: workspace.id,
        workspacePath: workspace.path,
        cli: agent.cli,
      })
    } catch (err) {
      await removeAgent(workspace.id, agent.id)
      return reply.code(500).send({
        error: err instanceof Error ? err.message : 'failed to spawn agent',
      })
    }

    return agent
  })

  app.post<{
    Params: { id: string; agentId: string }
    Body: { name?: string }
  }>('/api/workspaces/:id/agents/:agentId/sub', async (req, reply) => {
    const workspace = await getWorkspace(req.params.id)
    if (!workspace) return reply.code(404).send({ error: 'not found' })
    const parent = workspace.agents.find((a) => a.id === req.params.agentId)
    if (!parent) return reply.code(404).send({ error: 'parent not found' })
    if (parent.source === 'task') {
      return reply.code(400).send({ error: 'task child has no pty' })
    }

    const agent = await addAgent(workspace.id, {
      name: req.body?.name,
      parentId: parent.id,
      source: 'pty',
      cli: parent.cli ?? getSettings().cli,
    })
    if (!agent) return reply.code(500).send({ error: 'failed to create agent' })

    try {
      ptyManager.spawn({
        agentId: agent.id,
        workspaceId: workspace.id,
        workspacePath: workspace.path,
        cli: agent.cli,
      })
    } catch (err) {
      await removeAgent(workspace.id, agent.id)
      return reply.code(500).send({
        error: err instanceof Error ? err.message : 'failed to spawn agent',
      })
    }

    return agent
  })

  app.delete<{
    Params: { id: string; agentId: string }
  }>('/api/workspaces/:id/agents/:agentId', async (req, reply) => {
    const workspace = await getWorkspace(req.params.id)
    if (!workspace) return reply.code(404).send({ error: 'not found' })

    const children = workspace.agents.filter(
      (a) => a.parentId === req.params.agentId,
    )
    for (const child of children) {
      ptyManager.kill(child.id)
    }
    ptyManager.kill(req.params.agentId)

    const removed = await removeAgent(workspace.id, req.params.agentId)
    if (!removed) return reply.code(404).send({ error: 'not found' })
    return { ok: true }
  })

  app.get('/api/events', { websocket: true }, (socket) => {
    const onStatus = (agentId: string, status: string) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'status', agentId, status }))
      }
    }
    const onExit = (agentId: string, exitCode: number) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'exit', agentId, exitCode }))
      }
    }
    const onSpawn = (agent: unknown) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'spawn', agent }))
      }
    }
    const onRemove = (agentId: string) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'remove', agentId }))
      }
    }
    ptyManager.on('status', onStatus)
    ptyManager.on('exit', onExit)
    ptyManager.on('spawn', onSpawn)
    ptyManager.on('remove', onRemove)
    socket.on('close', () => {
      ptyManager.off('status', onStatus)
      ptyManager.off('exit', onExit)
      ptyManager.off('spawn', onSpawn)
      ptyManager.off('remove', onRemove)
    })
  })

  app.get<{
    Params: { agentId: string }
  }>('/ws/agents/:agentId', { websocket: true }, async (socket, req) => {
    const found = await getAgent(req.params.agentId)
    if (!found) {
      socket.close(4404, 'agent not found')
      return
    }

    if (found.agent.source === 'task') {
      socket.close(4403, 'task child has no pty')
      return
    }

    let session = ptyManager.getSession(req.params.agentId)
    if (!session) {
      try {
        session = ptyManager.spawn({
          agentId: found.agent.id,
          workspaceId: found.workspace.id,
          workspacePath: found.workspace.path,
          cli: found.agent.cli,
        })
      } catch (err) {
        socket.send(
          `\r\n\x1b[31mFailed to spawn agent: ${
            err instanceof Error ? err.message : String(err)
          }\x1b[0m\r\n`,
        )
        socket.close(1011, 'spawn failed')
        return
      }
    }

    const ok = ptyManager.attach(req.params.agentId, socket)
    if (!ok) {
      socket.close(1011, 'attach failed')
    }
  })

  await app.listen({ host: HOST, port: PORT })
  console.log(`cursor-isles api on http://${HOST}:${PORT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
