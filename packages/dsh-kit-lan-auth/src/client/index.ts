/** dsh-kit-lan-auth client: settings page to manage gateway tokens/users.
 *
 * The management page is host-only: it mutates the loopback DSH server's
 * user/token store, and the admin routes behind it refuse any LAN-originated
 * request (the gateway stamps proxied traffic with `x-dsh-kit-lan-auth-proxy`,
 * which the host routes reject with 403). A remote browser would therefore
 * render a dead page, so the `settings.section` entry is registered only when
 * the page authority is loopback — the browser accessing the DSH UI directly
 * on the host machine (127.0.0.1/localhost). A LAN client arriving through the
 * HTTPS gateway loads the shell with a non-loopback hostname, so
 * `connection.isLoopback` is false and the section stays hidden.
 */
import { createElement, useEffect, useState } from 'react'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'

export const name = 'dsh-kit-lan-auth'

/**
 * Services the fiber waits on before apply. Cordis resolves `connection` so
 * `isLoopback` is authoritative at apply time (server ordering is otherwise
 * unconstrained — the wire client provides it, and the loader waits).
 */
export const inject = ['connection']

const T = { bg: 'rgba(128,128,128,0.07)', border: 'rgba(128,128,128,0.35)', danger: '#e06c75', ok: '#4caf7d', radius: 8, muted: 'rgba(128,128,128,0.7)' }
const inputS = { flex: 1, padding: '6px 10px', borderRadius: T.radius, border: '1px solid ' + T.border, background: T.bg }
const buttonS = { padding: '6px 12px', borderRadius: T.radius, border: '1px solid ' + T.border, background: T.bg, cursor: 'pointer' }
const boxS = { border: '1px solid ' + T.border, borderRadius: T.radius, background: T.bg, padding: 10 }

function useFetch() {
  const [data, setData] = useState<{ port?: number; users?: unknown[]; tokens?: unknown[] } | null>(null)
  const [err, setErr] = useState('')
  const refresh = () => {
    fetch('/dsh-kit-lan-auth/status')
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setErr(String((e && e.message) || e)))
  }
  useEffect(refresh, [])
  return { data, err, setErr, refresh }
}

async function api(method: string, path: string, body?: unknown) {
  const opts: RequestInit = { method, headers: {} }
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body) }
  const res = await fetch(path, opts)
  const d = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((d && (d.error || d.message)) || 'HTTP ' + res.status)
  return d
}

function LanAuthPage() {
  const { data, err, setErr, refresh } = useFetch()
  const [userF, setUserF] = useState({ username: '', password: '' })
  const [tokenF, setTokenF] = useState({ name: '' })
  const [newToken, setNewToken] = useState<string | null>(null)

  const addUser = () => {
    setErr('')
    api('POST', '/dsh-kit-lan-auth/users', userF)
      .then(() => setUserF({ username: '', password: '' }))
      .then(refresh)
      .catch((e) => setErr(String((e && e.message) || e)))
  }
  const delUser = (id: unknown) => {
    if (!window.confirm('确定删除该用户？')) return
    api('POST', '/dsh-kit-lan-auth/users/delete', { id }).then(refresh).catch((e) => setErr(String((e && e.message) || e)))
  }
  const addToken = () => {
    setErr(''); setNewToken(null)
    api('POST', '/dsh-kit-lan-auth/tokens', tokenF)
      .then((r) => { setNewToken((r as { token: { token: string } }).token.token); setTokenF({ name: '' }) })
      .then(refresh)
      .catch((e) => setErr(String((e && e.message) || e)))
  }
  const delToken = (id: unknown) => {
    if (!window.confirm('确定删除该 token？')) return
    api('POST', '/dsh-kit-lan-auth/tokens/delete', { id }).then(refresh).catch((e) => setErr(String((e && e.message) || e)))
  }

  const row = (label: string, ctrl: unknown, k: string) =>
    createElement('div', { key: k, style: { display: 'flex', gap: 6, alignItems: 'center' } },
      createElement('label', { style: { width: 76, fontSize: 12, opacity: 0.8 } }, label), ctrl)

  const users = (data?.users ?? []) as Array<{ id: string; username: string }>
  const tokens = (data?.tokens ?? []) as Array<{ id: string; name: string; lastUsedAt: string }>

  void row

  return createElement('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760 } },
    createElement('div', { style: { fontSize: 15, fontWeight: 600 } }, '局域网鉴权（dsh-kit-lan-auth）'),
    createElement('div', { style: { fontSize: 12, opacity: 0.8 } },
      '自签名 HTTPS 网关。本机（localhost）免登录直接访问；局域网访问需携带有效 token 或登录。网关端口：' +
      (data && data.port ? String(data.port) : '…')),
    createElement('div', { style: boxS },
      createElement('div', { style: { marginBottom: 6, fontSize: 13, fontWeight: 600 } }, '已配置的用户'),
      users.length
        ? users.map((u) => createElement('div', { key: u.id, style: { display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid ' + T.border } },
            createElement('div', { style: { flex: 1, fontSize: 13 } }, u.username),
            createElement('button', { style: buttonS, onClick: () => delUser(u.id) }, '删除')))
        : createElement('div', { style: { opacity: 0.6, fontSize: 12 } }, '还没有用户。'),
      createElement('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
        createElement('input', { value: userF.username, onChange: (e) => setUserF({ ...userF, username: e.target.value }), placeholder: '用户名', style: { ...inputS, maxWidth: 180 } }),
        createElement('input', { type: 'password', value: userF.password, onChange: (e) => setUserF({ ...userF, password: e.target.value }), placeholder: '密码', style: { ...inputS, maxWidth: 180 } }),
        createElement('button', { style: { ...buttonS, fontWeight: 700 }, onClick: addUser, disabled: !userF.username.trim() || !userF.password }, '添加用户'),
      ),
    ),
    createElement('div', { style: boxS },
      createElement('div', { style: { marginBottom: 6, fontSize: 13, fontWeight: 600 } }, '访问 Token'),
      tokens.length
        ? tokens.map((t) => createElement('div', { key: t.id, style: { display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid ' + T.border } },
            createElement('div', { style: { flex: 1, fontSize: 13 } }, t.name),
            createElement('div', { style: { fontSize: 12, opacity: 0.6 } }, 'last: ' + new Date(t.lastUsedAt).toLocaleString()),
            createElement('button', { style: buttonS, onClick: () => delToken(t.id) }, '删除')))
        : createElement('div', { style: { opacity: 0.6, fontSize: 12 } }, '还没有 token。'),
      newToken
        ? createElement('div', { style: { marginTop: 8, padding: 8, borderRadius: T.radius, background: 'rgba(76,175,125,0.12)', fontSize: 12 } },
            '新 token（只显示一次）：', createElement('code', { style: { wordBreak: 'break-all' } }, newToken))
        : null,
      createElement('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
        createElement('input', { value: tokenF.name, onChange: (e) => setTokenF({ name: e.target.value }), placeholder: 'token 名称', style: { ...inputS, maxWidth: 200 } }),
        createElement('button', { style: { ...buttonS, fontWeight: 700 }, onClick: addToken }, '生成 Token'),
      ),
    ),
    err ? createElement('div', { style: { color: T.danger, fontSize: 13 } }, err) : null,
  )
}

export function apply(ctx: { get(name: string): unknown }): void {
  const slots = ctx.get('slots') as { inject(name: string, fn: () => unknown): unknown; register(...a: unknown[]): unknown } | undefined
  if (slots === undefined) return
  // Host-only management surface: hide the section for LAN browsers. The
  // admin routes are loopback-only, so a remote client gets nothing useful
  // here — and showing it would leak the feature into a page that cannot use
  // it. Gate registration on the same trust signal the connection uses.
  const connection = ctx.get('connection') as ConnectionHandle | undefined
  if (connection === undefined || !connection.isLoopback) return
  slots.inject('settings.section', () =>
    slots.register({ name: 'settings.section', id: 'dsh-kit-lan-auth', priority: 40, label: () => '局域网鉴权' }, () => createElement(LanAuthPage, null)),
  )
}
