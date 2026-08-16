/**
 * 进行中对话输入区下方的 worktree 条（conversation.composer.dock，权限下方）。
 *
 * 语义（不误导）：当前对话的 worktree 是固定的，不能原地切换；这里
 *   - 左侧：只读显示「当前对话」在哪个 worktree；
 *   - 右侧：「在新 worktree 新建会话」——在目标 worktree 开一个【新】空白会话并跳过去
 *     （原对话保留在原 worktree）。
 */

import { createElement, useEffect, useState } from 'react'
import type { Attribution, WorktreeController, WorktreeEntry, WorktreeList } from './controller.ts'
import { GitBranchIcon } from './icon.ts'

const tk = {
  text: 'var(--dsw-alias-label-primary)',
  secondary: 'var(--dsw-alias-label-secondary)',
  tertiary: 'var(--dsw-alias-label-tertiary)',
  border: 'var(--dsw-alias-border-l2)',
  panel: 'var(--dsw-alias-bg-layer-3)',
  primary: 'var(--dsw-alias-state-business-primary)',
  danger: 'var(--dsw-alias-state-error-primary)',
}

const AURA_CLASS = 'dsh-kit-worktree-dock'

function ensureStyle(): void {
  if (typeof document === 'undefined' || document.querySelector('#dsh-kit-worktree-dock-style') !== null) return
  const tag = document.createElement('style')
  tag.id = 'dsh-kit-worktree-dock-style'
  const sel = '.' + AURA_CLASS
  tag.textContent = sel + '{border-radius:16px;background:transparent}' + '\n' +
    sel + ':hover,' + sel + '[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover)}' + '\n'
  document.head.appendChild(tag)
}

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

export function WorktreeDock(props: Record<string, unknown>): unknown {
  const controller = props.controller as WorktreeController | undefined
  const useSession = props.useSession as ((sel: (s: unknown) => unknown) => unknown) | undefined
  const useSessions = props.useSessions as ((sel: (s: unknown) => unknown) => unknown) | undefined
  const sessionId = String(props.sessionId ?? '')

  // composer.dock 是 session 作用域：标准 props 提供 useSession/useSessions
  const blank = (useSession
    ? (useSession((s) => { const snap = s as { blank?: boolean } | undefined; return snap?.blank === true }) as boolean | undefined)
    : undefined) ?? false

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
    if (controller === undefined || cwd === undefined || cwd === '') return
    let cancelled = false
    setList(null)
    setAttribution(null)
    void controller.list(cwd)
      .then((next) => { if (!cancelled) setList(next) })
      .catch(() => {})
    void controller.attribution(cwd)
      .then((next) => { if (!cancelled) setAttribution(next) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [controller, cwd])

  // 新建会话页不显示这里（hero 有自己的选择器）
  if (blank || controller === undefined || cwd === undefined || cwd === '') return null
  ensureStyle()

  const currentLabel = attribution?.mode === 'worktree'
    ? (attribution.branch ?? 'worktree')
    : 'main'

  const run = async (fn: () => Promise<unknown>): Promise<void> => {
    setBusy(true)
    setError('')
    try { await fn(); setOpen(false) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  const openNewIn = (entry: WorktreeEntry): void => {
    void run(() => controller.bindExisting(entry.path))
  }
  const openNewInMain = (): void => {
    const root = list?.root ?? attribution?.root
    if (root === undefined) return
    void run(() => controller.bindExisting(root))
  }

  const linked = (list?.worktrees ?? []).filter((w) => !w.main)

  return createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      maxWidth: 'var(--dsh-composer-card-max-width)',
      margin: '0 auto',
      padding: '0 4px',
      color: tk.text,
      font: 'var(--dsw-font-xs-13)',
    },
  },
    createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, color: tk.secondary, whiteSpace: 'nowrap' } },
      createElement(GitBranchIcon, { size: 13 }),
      '当前 ',
      currentLabel,
    ),
    createElement('div', { style: { position: 'relative' } },
      createElement('button', {
        type: 'button',
        className: AURA_CLASS,
        style: {
          display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 26,
          padding: '0 8px', border: 'none', background: 'transparent', color: tk.text,
          cursor: 'pointer', font: 'inherit', fontWeight: 500, lineHeight: '20px', whiteSpace: 'nowrap',
          transition: 'background-color .16s ease, color .16s ease',
        },
        disabled: busy,
        onClick: () => setOpen((v) => !v),
        title: '在另一个 worktree 新建会话（当前对话保留）',
      },
        '在新 worktree 新建会话',
        createElement('span', { style: { color: tk.tertiary, flex: 'none', fontSize: 10 } }, '▾'),
      ),
      open
        ? createElement('div', {
            style: {
              boxSizing: 'border-box', position: 'absolute', zIndex: 30, top: 30, left: 0,
              minWidth: 220, padding: 6, border: `1px solid ${tk.border}`, borderRadius: 12,
              background: tk.panel, boxShadow: '0 8px 24px rgba(0,0,0,.18)',
              display: 'flex', flexDirection: 'column', gap: 4,
            },
          },
            createElement('div', { style: { fontSize: 11, color: tk.tertiary, padding: '4px 8px' } },
              '在新 worktree 开始一个新对话，当前对话保留。'),
            createElement('button', { type: 'button', style: item(tk, 'main', currentLabel), disabled: busy, onClick: openNewInMain },
              createElement('span', { style: { fontWeight: 500 } }, 'main'),
              createElement('span', { style: { color: tk.tertiary, fontSize: 11, marginLeft: 'auto' } }, pathBase(list?.root ?? attribution?.root ?? '')),
            ),
            ...linked.map((entry) =>
              createElement('button', { key: entry.path, type: 'button', style: item(tk, optionLabel(entry), currentLabel), disabled: busy, onClick: () => openNewIn(entry) },
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

function item(tkObj: typeof tk, label: string, currentLabel: string): Record<string, string> {
  return {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '7px 10px', border: 'none', borderRadius: 8, background: 'transparent',
    color: tkObj.text, cursor: 'pointer', font: 'inherit', textAlign: 'left',
    fontWeight: label === currentLabel ? '600' : '400',
  }
}
