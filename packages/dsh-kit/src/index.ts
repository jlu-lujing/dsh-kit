/** dsh-kit host plugin: aggregate shell + store state + feature toggling. */

import { execFile } from 'node:child_process'
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { createStore } from './state.ts'
import { FEATURES, type FeatureId } from './store.ts'
import { installPreset, uninstallPreset, isInstalled as isPresetInstalled, PRESET_ID } from './preset.ts'
import { createEcosystemController } from './ecosystem.ts'

/** Feature id of the inline preset feature (matches store.ts / state file). */
const PRESET_FEATURE_ID = `dsh-${PRESET_ID}` as const

/** Cordis plugin name. */
export const name = 'dsh-kit'

/** Required services: the web server hosts the store panel's management routes. */
export const inject = ['webServer']

/** The single install target of the one-click install: its npm dependencies bring the rest. */
const INSTALL_PACKAGE = 'dsh-kit'

export interface Config {
  /** Directory holding the dsh-kit state file. Defaults to dsh home. */
  stateDir?: string
  /** Profile the store panel's one-click install targets (default `web`). */
  installProfile?: string
}

/**
 * The dsh-kit service surface. The store panel and CLI consult it; feature
 * patch rows read the state file directly through their `disabled` expression
 * (self-contained, no service dependency), so the two stay consistent by
 * sharing the same state file path.
 */
export interface StoreRow {
  id: FeatureId
  name: string
  description: string
  enabled: boolean
  /** Only the anchored-standard preset feature exposes install/delete actions. */
  installable: boolean
  /** Whether the store offers an enable/disable toggle (false for preset installers). */
  togglable: boolean
  /** Whether the preset directory is currently on disk (installable features only). */
  installed: boolean
}

export interface DshKitService {
  /** Every known feature with its current on/off state. */
  list(): StoreRow[]
  /** Resolve whether a feature is currently enabled (missing entry = enabled). */
  featureState(id: FeatureId): boolean
  /** Persist a feature's on/off state. */
  setEnabled(id: FeatureId, enabled: boolean): void
}

/** Resolve the DSH home used by installer-aware features (mirrors upstream installer). */
function dshHome(): string {
  return process.env.DSH_HOME ?? `${process.env.HOME ?? '.'}/.dsh`
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

  const home = dshHome()

  // The bundled preset feature (previously a separate dsh-anchored-standard
  // package) is now managed inline by dsh-kit. When enabled, install the
  // bundled preset files idempotently (non-destructive: never overwrite an
  // existing target). Disabling does not auto-remove, so user data is kept.
  const presetFeature = FEATURES.find(f => f.installable === true && f.id === PRESET_FEATURE_ID)
  if (presetFeature && store.isEnabled(presetFeature.id)) {
    try {
      installPreset({ home })
    } catch {
      // Non-fatal: installation must not take down host startup; the store
      // panel lets the user retry manually.
    }
  }

  const service: DshKitService = {
    list: () => FEATURES.map(f => ({
      ...f,
      enabled: store.isEnabled(f.id),
      installable: f.installable === true,
      togglable: f.togglable !== false,
      installed: f.installable === true
        ? isPresetInstalled({ home })
        : false,
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
  const ecosystem = createEcosystemController()
  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const pathname = (req.url ?? '/').split('?')[0]
    if (req.method === 'GET') {
      if (pathname === PREFIX || pathname === `${PREFIX}/`) {
        return sendJson(res, 200, { features: service.list() })
      }
      // GET /dsh-kit/store/ecosystem[?refresh=1]
      // Read-only showcase of GitHub `topic:dsh-plugin` repositories (star
      // desc). No install action here: every repo documents its own setup.
      if (pathname === `${PREFIX}/ecosystem`) {
        try {
          const query = new URL(req.url ?? '/', 'http://localhost').searchParams
          const data = await ecosystem.catalog(query.get('refresh') === '1')
          return sendJson(res, 200, { ok: true, ...data })
        } catch (error) {
          return sendJson(res, 502, { error: String((error as Error).message ?? error) })
        }
      }
    }

    // POST /dsh-kit/store/install  — one-click install the whole family.
    // Mirrors the `dsh-kit install` CLI: the only install target is dsh-kit.
    // dsh-kit declares the four feature packages as npm dependencies, so
    // `dsh plugin --profile <p> add -w dsh-kit` installs them through the
    // profile's dependency tree and the aggregate patch mounts all five rows.
    // The feature packages are plain libraries (no dsh.bundle layer is added).
    // Requires the `dsh` CLI on PATH; applies to the configured installProfile
    // (default `web`), or a `{ profile }` request body override.
    if (req.method === 'POST' && pathname === `${PREFIX}/install`) {
      const installProfile = config.installProfile ?? 'web'
      const [contentType] = (req.headers['content-type'] ?? '').split(';')
      if (contentType !== 'application/json') {
        return sendJson(res, 415, { error: 'content-type must be application/json' })
      }
      try {
        const body = JSON.parse(await readBody(req)) as { profile?: unknown }
        const profile = typeof body.profile === 'string' && body.profile.trim()
          ? body.profile.trim()
          : installProfile
        const dshArgs = ['plugin', '--profile', profile, 'add', '-w', INSTALL_PACKAGE]
        const result = await new Promise<{ ok: boolean; code: string | number | null; stderr: string }>((resolve) => {
          execFile('dsh', dshArgs, { timeout: 180_000 }, (error, _stdout, stderr) => {
            const raw = (error as { code?: unknown } | null)?.code
            const code = typeof raw === 'string' || typeof raw === 'number' ? raw : null
            const detail = code === 'ENOENT'
              ? 'dsh CLI not found on PATH'
              : (stderr ?? '').slice(-2000)
            resolve({ ok: error === null, code, stderr: detail })
          })
        })
        // Pass through the profile so the panel can tell the user what to restart.
        return sendJson(res, result.ok ? 200 : 500, {
          ok: result.ok,
          ...(result.ok ? { installed: true, profile } : { error: 'install failed', detail: result.stderr, code: result.code, profile }),
        })
      } catch {
        return sendJson(res, 400, { error: 'bad request' })
      }
    }
    // POST /dsh-kit/store/{id}/install  — install an installable feature's
    // on-disk artifact (only dsh-anchored-standard currently): copies the
    // bundled preset into ~/.dsh/.agent-presets/anchored-standard.
    const installRoute = /^\/dsh-kit\/store\/([A-Za-z0-9._-]+)\/install$/.exec(pathname)
    if (req.method === 'POST' && installRoute !== null) {
      const id = installRoute[1]
      const feature = FEATURES.find(f => f.id === id && f.installable === true)
      if (!feature) return sendJson(res, 404, { error: `unknown or non-installable feature "${id}"` })
      try {
        const result = installPreset({ home })
        // Installing the artifact implies the feature should be enabled, so it
        // stays installed across restarts.
        service.setEnabled(id, true)
        return sendJson(res, 200, { ok: true, id, installed: result.installed, target: result.target })
      } catch (error) {
        return sendJson(res, 500, { error: String((error as Error).message ?? error) })
      }
    }

    // POST /dsh-kit/store/{id}/delete  — remove the feature's installed
    // artifact from disk (only installable features).
    const deleteRoute = /^\/dsh-kit\/store\/([A-Za-z0-9._-]+)\/delete$/.exec(pathname)
    if (req.method === 'POST' && deleteRoute !== null) {
      const id = deleteRoute[1]
      const feature = FEATURES.find(f => f.id === id && f.installable === true)
      if (!feature) return sendJson(res, 404, { error: `unknown or non-installable feature "${id}"` })
      try {
        const result = uninstallPreset({ home })
        // Removing the artifact also disables the feature so a later restart
        // does not silently re-install it (apply only installs while enabled).
        service.setEnabled(id, false)
        return sendJson(res, 200, { ok: true, id, removed: result.removed, target: result.target })
      } catch (error) {
        return sendJson(res, 500, { error: String((error as Error).message ?? error) })
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
