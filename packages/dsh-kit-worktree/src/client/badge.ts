/**
 * 会话头部（顶栏、对话名称旁）的 worktree 控件（conversation.session.header.utilities）。
 *
 * 结构：
 *   - 徽标：只读显示当前对话在哪个 worktree（main / 分支）
 *   - 小按钮：点击展开「在新 worktree 新建会话」列表
 *
 * 语义：会话 cwd 固定不可原地切换；选择某个 worktree = 在其目录开【新】空白
 * 会话并跳过去（当前对话保留）。
 */

import { createElement, useEffect, useState } from 'react'
import { GitBranchIcon } from './icon.ts'
import type { Attribution, WorktreeController, WorktreeEntry, WorktreeList } from './controller.ts'

const tk = {
  text: 'var(--dsw-alias-label-primary)',
  secondary: 'var(--dsw-alias-label-secondary)',
  tertiary: 'var(--dsw-alias-label-tertiary)',
  border: 'var(--dsw-alias-border-l2)',
  panel: 'var(--dsw-alias-bg-layer-3)',
  primary: 'var(--dsw-alias-state-business-primary)',
  danger: 'var(--dsw-alias-state-error-primary)',
  bluish: 'var(--dsw-alias-label-primary-bluish)',
}

const chip = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 22,
  padding: '0 8px',
  border: `1px solid ${tk.border}`,
  borderRadius: 999,
  background: 'color-mix(in srgb, var(--dsw-alias-state-business-tertiary) 55%, transparent)',
  color: tk.bluish,
  font: 'var(--dsw-font-xs-12)',
  lineHeight: '20px',
  whiteSpace: 'nowrap',
} as const

const ghost = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 22,
  padding: '0 8px',
  border: `1px solid ${tk.border}`,
  borderRadius: 999,
  background: 'transparent',
  color: tk.text,
  cursor: 'pointer',
  font: 'var(--dsw-font-xs-12)',
  fontWeight: 500,
  lineHeight: '20px',
  whiteSpace: 'nowrap',
  transition: 'background-color .16s ease, color .16s ease',
} as const

function pathBase(path: string): string {
  const parts = path.split(/[\/]/).filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1] : path
}

function branchOf(branch?: string): string {
  const prefix = 'refs/heads/'
  return branch !== undefined && branch.startsWith(prefix) ? branch.slice(prefix.length) : branch ?? ''
}

function optionLabel(e: WorktreeEntry): string {
  return branchOf(e.branch) || pathBase(e.path)
}

export function WorktreeBadge(props: Record<string, unknown>): unknown {
  const sessionId = String(props.sessionId ?? '')
  const controller = props.controller as WorktreeController | undefined
  const useSessions = props.useSessions as ((sel: (snapshot: unknown) => unknown) => unknown) | undefined

  const cwd = useSessions
    ? (useSessions((snapshot) => {
        const s = snapshot as { byId?: Record<string, { cwd?: string } | undefined> } | undefined
        return s?.byId?.[sessionId]?.cwd
      }) as string | undefined)
    : undefined

  const [list, setList] = useState<WorktreeList | null>(null)
  const [attribution, setAttribution] = useState<Attribution | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (controller === undefined || cwd === undefined || cwd === '') {
      setList(null)
      setAttribution(null)
      return
    }
    let cancelled = false
    setList(null)
    setAttribution(null)
    void controller.list(cwd)
      .then((next) => { if (!cancelled) setList(next) })
      .catch(() => {})
    void controller.attribution(cwd)
      .then((next) => { if (!cancelled) setAttribution(next) })
      .catch(() => { if (!cancelled) setAttribution({ mode: 'main', root: cwd }) })
    return () => { cancelled = true }
  }, [controller, cwd])

  if (controller === undefined || cwd === undefined || cwd === '' || attribution === null) return null

  const label = attribution.mode === 'worktree'
    ? (attribution.branch ?? 'worktree')
    : 'main'
  const title = attribution.mode === 'worktree'
    ? `worktree: ${attribution.path ?? ''}`
    : `main: ${attribution.root ?? cwd}`

  const run = async (fn: () => Promise<unknown>): Promise<void> => {
    setBusy(true)
    setError('')
    try { await fn(); setOpen(false) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }
  const openIn = (entry: WorktreeEntry): void => { void run(() => controller.bindExisting(entry.path)) }
  const openMain = (): void => {
    const root = list?.root ?? attribution.root
    if (root === undefined) return
    void run(() => controller.bindExisting(root))
  }

  const linked = (list?.worktrees ?? []).filter((w) => !w.main)

  return createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
    createElement('span', { style: chip, title }, createElement(GitBranchIcon, { size: 12 }), label),
    createElement('div', { style: { position: 'relative' } },
      createElement('button', {
        type: 'button',
        style: ghost,
        disabled: busy,
        onClick: () => setOpen((v) => !v),
        title: '在新 worktree 新建会话（当前对话保留）',
      },
        '＋新会话',
        createElement('span', { style: { color: tk.tertiary, flex: 'none', fontSize: 9 } }, '▾'),
      ),
      open
        ? createElement('div', {
            style: {
              boxSizing: 'border-box', position: 'absolute', zIndex: 40, top: 28, right: 0,
              minWidth: 220, padding: 6, border: `1px solid ${tk.border}`, borderRadius: 12,
              background: tk.panel, boxShadow: '0 8px 24px rgba(0,0,0,.2)',
              display: 'flex', flexDirection: 'column', gap: 3,
            },
          },
            createElement('div', { style: { fontSize: 11, color: tk.tertiary, padding: '4px 8px' } },
              '在新 worktree 开始新对话；当前对话保留。'),
            createElement('button', { type: 'button', style: item(tk, label), disabled: busy, onClick: openMain },
              createElement('span', { style: { fontWeight: 500 } }, 'main'),
              createElement('span', { style: { color: tk.tertiary, fontSize: 11, marginLeft: 'auto' } },
                pathBase(list?.root ?? attribution.root ?? '')),
            ),
            ...linked.map((entry) =>
              createElement('button', { key: entry.path, type: 'button', style: item(tk, optionLabel(entry)), disabled: busy, onClick: () => openIn(entry) },
                createElement('span', { style: { fontWeight: 500 } }, optionLabel(entry)),
              ),
            ),
            error
              ? createElement('div', { style: { color: tk.danger, fontSize: 11, padding: '4px 10px' } }, error)
              : null,
          )
        : null,
    ),
  )
}

function item(tkObj: typeof tk, currentLabel: string): Record<string, string | number> {
  return {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '6px 10px', border: 'none', borderRadius: 8, background: 'transparent',
    color: tkObj.text, cursor: 'pointer', font: 'inherit', textAlign: 'left',
  }
}
