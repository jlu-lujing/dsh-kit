/** dsh-kit-webui host plugin: 主题商店的管理路由（loopback）+ 持久化。 */

import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  loadStoreState, saveStoreState, defaultStateDir,
  type ThemeRecord, type ThemeStoreState,
} from './store.ts'

/** Cordis plugin name. */
export const name = 'dsh-kit-webui'

/** Required services: the web server hosts the theme store's management routes. */
export const inject = ['webServer']

export interface Config {
  /** Directory holding the theme store file. Defaults to dsh home. */
  stateDir?: string
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
 * Host service surface. The client panel calls it through the loopback
 * webServer routes; it is the durable authority for user-defined themes.
 */
export interface DshKitWebUiService {
  /** Every theme (builtin + custom). The client registers each on apply. */
  listThemes(): ThemeRecord[]
  /** Add or replace a theme by id. */
  saveTheme(theme: ThemeRecord): void
  /** Delete a custom theme. Builtins are immutable (returns false). */
  deleteTheme(id: string): boolean
  /** Current active theme + global layer (shared across origins). */
  getState(): ThemeStoreState
  /** Persist active theme id (null = follow official). */
  setActive(active: string | null): void
  /** Persist the global layer. */
  setGlobal(global: Record<string, { light: string; dark: string }>): void
}

/**
 * Loopback management routes backing the theme store panel:
 *
 *   GET    /dsh-kit-webui/themes          → { themes: [...] }
 *   POST   /dsh-kit-webui/themes          body { theme }  → { ok: true }  (add/replace)
 *   POST   /dsh-kit-webui/themes/delete   body { id }     → { ok: true }
 *
 * The routes live on the loopback DSH webServer, so LAN traffic through the
 * gateway reaches them as a loopback caller — same trust plane as dsh-kit's
 * own store routes (no auth here; the gateway is the auth boundary).
 */
export function apply(ctx: Context, config: Config = {}): void {
  const stateDir = config.stateDir ?? defaultStateDir()
  const state = loadStoreState(stateDir)
  const themes = state.themes

  const service: DshKitWebUiService = {
    listThemes: () => [...themes],
    saveTheme: (theme: ThemeRecord) => {
      const i = themes.findIndex((t) => t.id === theme.id)
      if (i === -1) themes.push(theme)
      else themes[i] = theme
      saveStoreState(stateDir, { themes, active: state.active, global: state.global })
    },
    deleteTheme: (id: string): boolean => {
      const t = themes.find((x) => x.id === id)
      if (!t || t.builtin) return false
      const next = themes.filter((x) => x.id !== id)
      // mutate in place so in-memory stays authoritative
      themes.length = 0
      themes.push(...next)
      saveStoreState(stateDir, { themes, active: state.active, global: state.global })
      return true
    },
    getState: () => ({ active: state.active, global: { ...state.global } }),
    setActive: (active: string | null) => {
      state.active = active ?? null
      saveStoreState(stateDir, { themes, active: state.active, global: state.global })
    },
    setGlobal: (global) => {
      state.global = global ?? {}
      saveStoreState(stateDir, { themes, active: state.active, global: state.global })
    },
  }

  ctx.provide('dshKitWebUi')
  ctx.set('dshKitWebUi', service)

  const webServer = ctx.get('webServer') as {
    register(opts: {
      kind: 'exact' | 'prefix'
      path: string
      handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
    }): (() => void) | undefined
  } | undefined
  if (webServer === undefined) return

  const disposers = [
    webServer.register({
      kind: 'exact',
      path: '/dsh-kit-webui/themes',
      handler: (req, res) => {
        if (req.method === 'GET') {
          return sendJson(res, 200, {
            themes: service.listThemes(),
            active: state.active,
            global: state.global,
          })
        }
        if (req.method === 'POST') {
          return void readBody(req).then((raw) => {
            try {
              const { theme } = JSON.parse(raw) as { theme?: ThemeRecord }
              if (!theme || !theme.id) {
                sendJson(res, 400, { error: 'invalid theme' })
                return
              }
              service.saveTheme(theme)
              sendJson(res, 200, { ok: true })
            } catch {
              sendJson(res, 400, { error: 'invalid JSON' })
            }
          })
        }
        return sendJson(res, 405, { error: 'method not allowed' })
      },
    }),
    webServer.register({
      kind: 'exact',
      path: '/dsh-kit-webui/state',
      handler: (req, res) => {
        if (req.method === 'GET') {
          return sendJson(res, 200, service.getState())
        }
        if (req.method === 'POST') {
          return void readBody(req).then((raw) => {
            try {
              const body = JSON.parse(raw) as { active?: unknown; global?: unknown }
              if ('active' in body) {
                if (body.active !== null && typeof body.active !== 'string') {
                  sendJson(res, 400, { error: 'invalid active' })
                  return
                }
                service.setActive(body.active as string | null)
              }
              if (body.global !== undefined) {
                service.setGlobal(body.global as Record<string, { light: string; dark: string }>)
              }
              sendJson(res, 200, { ok: true })
            } catch {
              sendJson(res, 400, { error: 'invalid JSON' })
            }
          })
        }
        return sendJson(res, 405, { error: 'method not allowed' })
      },
    }),
    webServer.register({
      kind: 'exact',
      path: '/dsh-kit-webui/themes/delete',
      handler: (req, res) => {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' })
        return void readBody(req).then((raw) => {
          try {
            const { id } = JSON.parse(raw) as { id?: unknown }
            if (typeof id !== 'string' || !id) {
              sendJson(res, 400, { error: 'id required' })
              return
            }
            const removed = service.deleteTheme(id)
            if (!removed) {
              sendJson(res, 404, { error: 'not found or builtin' })
              return
            }
            sendJson(res, 200, { ok: true })
          } catch {
            sendJson(res, 400, { error: 'invalid JSON' })
          }
        })
      },
    }),
  ]
  ctx.effect(() => () => disposers.forEach((d) => d?.()), 'dsh-kit-webui.theme-routes')
}
