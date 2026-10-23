import { randomUUID } from 'node:crypto'
import { connect, type Socket } from 'node:net'
import { homedir } from 'node:os'
import { join } from 'node:path'

export function herdrSocketPath() {
  return process.env.HERDR_SOCKET_PATH || join(homedir(), '.config', 'herdr', 'herdr.sock')
}

export class HerdrError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}

interface HerdrMessage {
  id?: string
  result?: unknown
  error?: { code?: string; message?: string }
  event?: string
  data?: unknown
}

export function herdrCall<T>(
  method: string,
  params: object = {},
  timeoutMs = 15_000,
  socketPath = herdrSocketPath(),
): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = randomUUID()
    let buf = ''
    let settled = false
    const socket = connect(socketPath)
    const finish = (err?: Error, value?: T) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.destroy()
      if (err) reject(err)
      else resolve(value as T)
    }
    const timer = setTimeout(() => {
      finish(new HerdrError(`Herdr timed out during ${method}`, 'timeout'))
    }, timeoutMs)

    socket.setEncoding('utf8')
    socket.on('connect', () => {
      socket.write(`${JSON.stringify({ id, method, params })}\n`)
    })
    socket.on('error', (err: NodeJS.ErrnoException) => {
      const missing = err.code === 'ENOENT' || err.code === 'ECONNREFUSED'
      finish(
        new HerdrError(
          missing
            ? 'Herdr is not running. Start it with herdr, then reload.'
            : err.message,
          missing ? 'offline' : 'connect',
        ),
      )
    })
    socket.on('data', (chunk: string) => {
      buf += chunk
      let newline = buf.indexOf('\n')
      while (newline >= 0) {
        const line = buf.slice(0, newline)
        buf = buf.slice(newline + 1)
        newline = buf.indexOf('\n')
        if (!line.trim()) continue
        let message: HerdrMessage
        try {
          message = JSON.parse(line) as HerdrMessage
        } catch {
          continue
        }
        if (message.id !== id) continue
        if (message.error) {
          finish(
            new HerdrError(
              message.error.message || 'Herdr refused the request',
              message.error.code || 'error',
            ),
          )
          return
        }
        finish(undefined, message.result as T)
        return
      }
    })
    socket.on('close', () => {
      finish(new HerdrError(`Herdr closed the socket during ${method}`, 'closed'))
    })
  })
}

export interface HerdrWatchHandlers {
  onEvent: () => void
  onFail: () => void
}

export class HerdrWatch {
  private socket: Socket | null = null
  private generation = 0
  private buf = ''
  open = false
  pending = false

  constructor(private socketPath: string) {}

  listen(subscriptions: Array<Record<string, unknown>>, handlers: HerdrWatchHandlers) {
    this.stop()
    const generation = ++this.generation
    const socket = connect(this.socketPath)
    this.socket = socket
    this.buf = ''
    this.pending = true
    const id = `atoll-watch-${generation}`
    let ready = false
    let failed = false

    const fail = () => {
      if (generation !== this.generation || failed) return
      failed = true
      this.pending = false
      this.open = false
      handlers.onFail()
      socket.destroy()
    }

    socket.setEncoding('utf8')
    socket.on('connect', () => {
      if (generation !== this.generation) return
      socket.write(
        `${JSON.stringify({
          id,
          method: 'events.subscribe',
          params: { subscriptions },
        })}\n`,
      )
    })
    socket.on('error', () => {
      fail()
    })
    socket.on('close', () => {
      if (generation !== this.generation || failed) return
      this.pending = false
      this.open = false
      if (!ready) handlers.onFail()
      else handlers.onEvent()
    })
    socket.on('data', (chunk: string) => {
      if (generation !== this.generation) return
      this.buf += chunk
      let newline = this.buf.indexOf('\n')
      while (newline >= 0) {
        const line = this.buf.slice(0, newline)
        this.buf = this.buf.slice(newline + 1)
        newline = this.buf.indexOf('\n')
        if (!line.trim()) continue
        let message: HerdrMessage
        try {
          message = JSON.parse(line) as HerdrMessage
        } catch {
          continue
        }
        if (message.id === id && message.error) {
          console.warn(
            `herdr subscribe refused: ${message.error.code ?? 'error'} ${message.error.message ?? ''}`,
          )
          fail()
          return
        }
        const result = message.result as { type?: string } | undefined
        if (message.id === id && result?.type === 'subscription_started') {
          ready = true
          this.pending = false
          this.open = true
          continue
        }
        if (message.error?.code === 'events_lost') {
          handlers.onEvent()
          fail()
          return
        }
        if (message.event) handlers.onEvent()
      }
    })
  }

  stop() {
    this.generation += 1
    this.open = false
    this.pending = false
    this.buf = ''
    this.socket?.destroy()
    this.socket = null
  }
}
