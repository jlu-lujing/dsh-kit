/** dsh-kit client: feature store panel in the sidebar footer (开箱即用的功能开关). */

import { createElement, useEffect, useState } from 'react'

export const name = 'dsh-kit'

/** Required wire-facing service so the panel can read loopback state (mirrors lan-auth). */
export const inject = ['connection']

interface Feature {
  id: string
  name: string
  description: string
  enabled: boolean
}

const T = { bg: 'rgba(128,128,128,0.07)', border: 'rgba(128,128,128,0.35)', radius: 8, muted: 'rgba(128,128,128,0.7)', ok: '#4caf7d', danger: '#e06c75' }

function useStore() {
  const [features, setFeatures] = useState<Feature[] | null>(null)
  const [err, setErr] = useState('')
  const refresh = () => {
    fetch('/dsh-kit/store')
      .then((r) => r.json())
      .then((d) => setFeatures((d as { features: Feature[] }).features))
      .catch((e) => setErr(String((e && e.message) || e)))
  }
  useEffect(refresh, [])
  return { features, err, setErr, refresh }
}

async function api(path: string, enabled: boolean) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((d && (d.error || d.message)) || 'HTTP ' + res.status)
  return d
}

function StorePanel() {
  const { features, err, setErr, refresh } = useStore()
  const [busy, setBusy] = useState<string | null>(null)

  const toggle = (f: Feature) => {
    setErr(''); setBusy(f.id)
    api(`/dsh-kit/store/${f.id}`, !f.enabled)
      .then(refresh)
      .catch((e) => setErr(String((e && e.message) || e)))
      .finally(() => setBusy(null))
  }

  const rows = features ?? []
  return createElement('div', { style: { padding: 12, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 240, maxWidth: 320 } },
    createElement('div', { style: { fontSize: 13, fontWeight: 700 } }, 'dsh-kit 功能商店'),
    createElement('div', { style: { fontSize: 11, opacity: 0.7 } }, '启停功能，重启后保留。'),
    rows.length === 0 && !err
      ? createElement('div', { style: { opacity: 0.6, fontSize: 12 } }, '加载中…')
      : null,
    rows.map((f) =>
      createElement('div', { key: f.id, style: { border: '1px solid ' + T.border, borderRadius: T.radius, background: T.bg, padding: 8, display: 'flex', gap: 8, alignItems: 'center' } },
        createElement('div', { style: { flex: 1, minWidth: 0 } },
          createElement('div', { style: { fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 } },
            f.name,
            createElement('span', {
              style: {
                fontSize: 10, padding: '1px 6px', borderRadius: 8,
                color: '#fff', background: f.enabled ? T.ok : T.danger, opacity: 0.9,
              },
            }, f.enabled ? '开' : '关'),
          ),
          createElement('div', { style: { fontSize: 11, opacity: 0.7, marginTop: 2 } }, f.description),
        ),
        createElement('button', {
          style: {
            padding: '4px 10px', borderRadius: T.radius, border: '1px solid ' + T.border,
            background: 'transparent', color: 'inherit', cursor: busy === f.id ? 'wait' : 'pointer', fontSize: 12, whiteSpace: 'nowrap',
          },
          onClick: () => toggle(f),
          disabled: busy !== null,
        }, busy === f.id ? '…' : (f.enabled ? '停用' : '启用')),
      ),
    ),
    err ? createElement('div', { style: { color: T.danger, fontSize: 12 } }, err) : null,
  )
}

/** Registration through the slot system; the shell provides the `settings.section` hole. */
export function apply(ctx: { get(name: string): unknown }): void {
  const slots = ctx.get('slots') as { inject(name: string, fn: () => unknown): unknown; register(...a: unknown[]): unknown } | undefined
  if (slots === undefined) return
  slots.inject('settings.section', () =>
    slots.register({ name: 'settings.section', id: 'dsh-kit-store', priority: 40, label: () => '功能商店' }, () => createElement(StorePanel, null)),
  )
}
