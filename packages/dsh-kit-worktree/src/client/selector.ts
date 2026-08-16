/**
 * 新建会话 hero 的 worktree 选择行（挂在 conversation.input.dock）。
 *
 * 仅 blank 会话（新建会话页）可见；进入正式对话后自动消失。当前会话的
 * cwd 由标准 props 的 useSessions 提供，归属与 worktree 列表由 host 路由解析。
 */

import { createElement, useEffect, useState } from 'react'
import type { Attribution, WorktreeController, WorktreeEntry, WorktreeList } from './controller.ts'

const tk = {
  text: 'var(--dsw-alias-label-primary)',
  secondary: 'var(--dsw-alias-label-secondary)',
  tertiary: 'var(--dsw-alias-label-tertiary)',
  border: 'var(--dsw-alias-border-l2)',
  panel: 'var(--dsw-alias-bg-layer-3)',
  primary: 'var(--dsw-alias-state-business-primary)',
  danger: 'var(--dsw-alias-state-error-primary)',
}

const rowStyle = {
  boxSizing: 'border-box',
  width: 'calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance))',
  maxWidth: 'var(--dsh-composer-card-max-width)',
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  border: `1px solid ${tk.border}`,
  borderRadius: 12,
  background: 'color-mix(in srgb, var(--dsw-specific-tip) 60%, transparent)',
  color: tk.text,
  font: 'var(--dsw-font-xs-13)',
} as const

const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 26,
  padding: '0 10px',
  border: `1px solid ${tk.border}`,
  borderRadius: 999,
  background: 'transparent',
  color: tk.text,
  cursor: 'pointer',
  font: 'inherit',
  lineHeight: '24px',
} as const

const ghostStyle = {
  ...chipStyle,
  color: tk.secondary,
} as const

const menuStyle = {
  boxSizing: 'border-box',
  position: 'absolute',
  zIndex: 30,
  marginTop: 4,
  minWidth: 240,
  padding: 6,
  border: `1px solid ${tk.border}`,
  borderRadius: 12,
  background: tk.panel,
  boxShadow: '0 8px 24px rgba(0,0,0,.18)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
} as const

const itemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '7px 10px',
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: tk.text,
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left',
} as const

function pathBase(path: string): string {
  const parts = path.split(/[\/]/).filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1] : path
}

function shortBranch(branch?: string): string {
  const prefix = 'refs/heads/'
  return branch !== undefined && branch.startsWith(prefix) ? branch.slice(prefix.length) : branch ?? ''
}

function optionLabel(entry: WorktreeEntry): string {
  return shortBranch(entry.branch) || pathBase(entry.path)
}

export function WorktreeSelector(props: Record<string, unknown>): unknown {
  const sessionId = String(props.sessionId ?? '')
  const controller = props.controller as WorktreeController | undefined
  const useSession = props.useSession as ((sel: (snapshot: unknown) => unknown) => unknown) | undefined
  const useSessions = props.useSessions as ((sel: (snapshot: unknown) => unknown) => unknown) | undefined

  const blank = (useSession
    ? (useSession((snapshot) => {
        const s = snapshot as { blank?: boolean; composerPhase?: string } | undefined
        return s?.blank === true || s?.composerPhase === 'blank'
      }) as boolean | undefined)
    : undefined) ?? false

  const cwd = useSessions
    ? (useSessions((snapshot) => {
        const s = snapshot as { byId?: Record<string, { cwd?: string } | undefined> } | undefined
        return s?.byId?.[sessionId]?.cwd
      }) as string | undefined)
    : undefined

  const [list, setList] = useState<WorktreeList | null>(null)
  const [attribution, setAttribution] = useState<Attribution | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [branch, setBranch] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!blank || controller === undefined || cwd === undefined || cwd === '') return
    let cancelled = false
    setList(null)
    setAttribution(null)
    setError('')
    void controller.list(cwd)
      .then((next) => { if (!cancelled) setList(next) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
    void controller.attribution(cwd)
      .then((next) => { if (!cancelled) setAttribution(next) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [blank, controller, cwd])

  if (!blank || controller === undefined) return null

  const currentLabel = attribution?.mode === 'worktree'
    ? (attribution.branch ?? 'worktree')
    : 'main'

  const run = async (fn: () => Promise<unknown>): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      await fn()
      setOpen(false)
      setCreating(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const chooseMain = (): void => {
    const root = list?.root ?? attribution?.root
    if (root === undefined) return
    void run(() => controller.bindExisting(root))
  }

  const chooseWorktree = (entry: WorktreeEntry): void => {
    void run(() => controller.bindExisting(entry.path))
  }

  const createNew = (): void => {
    const root = list?.root ?? attribution?.root
    const name = branch.trim()
    if (root === undefined || name === '') {
      setError('请先选择项目文件夹，并填写分支名')
      return
    }
    void run(() => controller.createAndBind({ cwd: root, branch: name }))
  }

  const linked = (list?.worktrees ?? []).filter((w) => !w.main)

  return createElement('div', { style: rowStyle },
    createElement('span', { style: { color: tk.tertiary, whiteSpace: 'nowrap' } }, 'worktree'),
    createElement('div', { style: { position: 'relative' } },
      createElement('button', {
        type: 'button',
        style: chipStyle,
        disabled: busy,
        onClick: () => setOpen((v) => !v),
        title: attribution?.mode === 'worktree' ? attribution.path : attribution?.root,
      },
        '🌿 ',
        currentLabel,
        createElement('span', { style: { color: tk.tertiary, fontSize: 10 } }, '▾'),
      ),
      open
        ? createElement('div', { style: { ...menuStyle, top: 34, left: 0 } },
            createElement('button', {
              type: 'button',
              style: itemStyle,
              disabled: busy,
              onClick: chooseMain,
            },
              createElement('span', { style: { fontWeight: currentLabel === 'main' ? 600 : 400 } }, 'main'),
              createElement('span', { style: { color: tk.tertiary, fontSize: 11, marginLeft: 'auto' } },
                pathBase(list?.root ?? attribution?.root ?? '')),
            ),
            ...linked.map((entry) =>
              createElement('button', {
                key: entry.path,
                type: 'button',
                style: itemStyle,
                disabled: busy,
                onClick: () => chooseWorktree(entry),
              },
                createElement('span', { style: { fontWeight: currentLabel === optionLabel(entry) ? 600 : 400 } },
                  optionLabel(entry)),
                createElement('span', { style: { color: tk.tertiary, fontSize: 11, marginLeft: 'auto' } },
                  '.dsh/worktree/' + pathBase(entry.path)),
              ),
            ),
            createElement('button', {
              type: 'button',
              style: { ...itemStyle, color: tk.primary },
              disabled: busy,
              onClick: () => { setCreating((v) => !v); setOpen(false) },
            }, '+ 新建 worktree（分支）'),
          )
        : null,
    ),
    creating
      ? createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flex: 1 } },
          createElement('input', {
            value: branch,
            autoFocus: true,
            placeholder: '分支名，例如 feat/xxx',
            style: {
              flex: 1,
              minWidth: 120,
              height: 26,
              padding: '0 10px',
              border: `1px solid ${tk.border}`,
              borderRadius: 999,
              background: 'transparent',
              color: tk.text,
              font: 'inherit',
            },
            onChange: (e: { target: { value: string } }) => setBranch(e.target.value),
            onKeyDown: (e: { key: string }) => {
              if (e.key === 'Enter') createNew()
              if (e.key === 'Escape') { setCreating(false); setBranch('') }
            },
          }),
          createElement('button', {
            type: 'button',
            style: { ...ghostStyle, borderColor: tk.primary, color: tk.primary },
            disabled: busy || branch.trim() === '',
            onClick: createNew,
          }, busy ? '…' : '创建'),
          createElement('button', {
            type: 'button',
            style: ghostStyle,
            disabled: busy,
            onClick: () => { setCreating(false); setBranch('') },
          }, '取消'),
        )
      : null,
    error
      ? createElement('span', { style: { color: tk.danger, fontSize: 11, whiteSpace: 'nowrap' } }, error)
      : createElement('span', {
          style: { color: tk.tertiary, fontSize: 11, marginLeft: 'auto', whiteSpace: 'nowrap' },
        },
        list === null ? '…' : `${linked.length} 个分支 worktree`),
  )
}
