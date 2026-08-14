/** dsh-kit host plugin: aggregate shell + store state + feature toggling. */

import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { createStore } from './state.ts'
import { FEATURES, type FeatureId } from './store.ts'

/** Cordis plugin name. */
export const name = 'dsh-kit'

/** Required services: the web server hosts the store panel's management routes. */
export const inject = ['webServer']

export interface Config {
  /** Directory holding the dsh-kit state file. Defaults to dsh home. */
  stateDir?: string
}

/**
 * The dsh-kit service surface. The store panel and CLI consult it; feature
 * patch rows read the state file directly through their `disabled` expression
 * (self-contained, no service dependency), so the two stay consistent by
 * sharing the same state file path.
 */
export interface DshKitService {
  /** Every known feature with its current on/off state. */
  list(): Array<{ id: FeatureId; name: string; description: string; enabled: boolean }>
  /** Resolve whether a feature is currently enabled (missing entry = enabled). */
  featureState(id: FeatureId): boolean
  /** Persist a feature's on/off state. */
  setEnabled(id: FeatureId, enabled: boolean): void
}

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })

/**
 * HTTP management routes backing the store panel. Concise JSON only; the
 * panel reads a snapshot and issues enable/disable per row:
 *
 *   GET  /dsh-kit/store            → { features: [{ id, name, description, enabled }] }
 *   POST /dsh-kit/store/{id}       body { enabled: boolean } → { ok: true }
 *
 * The routes are registered on the loopback DSH webServer, so LAN traffic
 * through the gateway arrives via loopback with the proxy marker — DSH treats
 * it as a loopback caller and the routes answer (same plane as the toggle
 * CLI). No auth is added here: the gateway is the auth boundary.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const defaults = Object.fromEntries(FEATURES.map(f => [f.id, f.defaultEnabled ?? true])) as Partial<Record<FeatureId, boolean>>
  const store = createStore(config.stateDir, defaults)
  store.load()

  const service: DshKitService = {
    list: () => FEATURES.map(f => ({
      ...f,
      enabled: store.isEnabled(f.id),
    })),
    featureState: id => store.isEnabled(id),
    setEnabled: (id, enabled) => {
      store.setEnabled(id, enabled)
    },
  }

  // Both names resolve through the loader's `!!js` `with (ctx)` scope.
  ctx.provide('dshKit.store')
  ctx.set('dshKit.store', service)
  ctx.provide('dshKit.featureState', service.featureState)
  ctx.set('dshKit.featureState', service.featureState)

  const webServer = ctx.get('webServer')
  if (webServer === undefined) return

  const PREFIX = '/dsh-kit/store'
  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const pathname = (req.url ?? '/').split('?')[0]
    if (req.method === 'GET') {
      if (pathname === PREFIX || pathname === `${PREFIX}/`) {
        return sendJson(res, 200, { features: service.list() })
      }
    }
    // POST /dsh-kit/store/{id} { enabled }
    const idMatch = /^\/dsh-kit\/store\/([A-Za-z0-9._-]+)$/.exec(pathname)
    if (req.method === 'POST' && idMatch !== null) {
      const [contentType] = (req.headers['content-type'] ?? '').split(';')
      if (contentType !== 'application/json') return sendJson(res, 415, { error: 'content-type must be application/json' })
      try {
        const body = JSON.parse(await readBody(req)) as { enabled?: unknown }
        if (typeof body.enabled !== 'boolean') return sendJson(res, 400, { error: 'enabled must be a boolean' })
        const id = idMatch[1]
        if (!FEATURES.some(f => f.id === id)) return sendJson(res, 404, { error: `unknown feature "${id}"` })
        service.setEnabled(id, body.enabled)
        return sendJson(res, 200, { ok: true, id, enabled: body.enabled })
      } catch {
        return sendJson(res, 400, { error: 'bad request' })
      }
    }
    sendJson(res, 404, { error: 'not found' })
  }
  const dispose = webServer.register({ kind: 'prefix', path: PREFIX, handler })
  ctx.effect(() => () => dispose?.(), 'dsh-kit.store.http-routes')
}
