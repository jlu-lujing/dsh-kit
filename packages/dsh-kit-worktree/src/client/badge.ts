/**
 * 会话头部归属徽标（挂在 conversation.session.header.utilities）。
 *
 * 每次当前会话 cwd 变化时向 host 查询归属；main 显示 `main`，linked
 * worktree 显示分支名，并带目录路径 tooltip。
 */

import { createElement, useEffect, useState } from 'react'
import { GitBranchIcon } from './icon.ts'
import type { Attribution, WorktreeController } from './controller.ts'

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 22,
  padding: '0 9px',
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 999,
  background: 'color-mix(in srgb, var(--dsw-alias-state-business-tertiary) 55%, transparent)',
  color: 'var(--dsw-alias-label-primary-bluish)',
  font: 'var(--dsw-font-xs-12)',
  lineHeight: '20px',
  whiteSpace: 'nowrap',
} as const


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

  const [attribution, setAttribution] = useState<Attribution | null>(null)

  useEffect(() => {
    if (controller === undefined || cwd === undefined || cwd === '') {
      setAttribution(null)
      return
    }
    let cancelled = false
    setAttribution(null)
    void controller.attribution(cwd)
      .then((next) => { if (!cancelled) setAttribution(next) })
      .catch(() => { if (!cancelled) setAttribution({ mode: 'main', root: cwd }) })
    return () => { cancelled = true }
  }, [controller, cwd])

  if (cwd === undefined || cwd === '' || attribution === null) return null

  const label = attribution.mode === 'worktree'
    ? (attribution.branch ?? 'worktree')
    : 'main'
  const title = attribution.mode === 'worktree'
    ? `worktree: ${attribution.path ?? ''}`
    : `main: ${attribution.root ?? cwd}`

  return createElement('span', { style: badgeStyle, title }, createElement(GitBranchIcon, {}), label)
}
