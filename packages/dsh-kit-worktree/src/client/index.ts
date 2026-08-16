/**
 * dsh-kit-worktree client half。
 *
 * 注册两个 UI 注入点：
 *   1. `conversation.input.dock`  —— 新建会话 hero 的 worktree 选择行
 *      （main 默认 / 已存在分支 / 新建分支并绑定）；
 *   2. `conversation.session.header.utilities` —— 已打开对话顶部的归属徽标
 *      （main 或当前 worktree 分支）。
 *
 * 数据全部来自 host 路由（/dsh-kit-worktree/...）；把 worktree 注册成 DSH
 * workspace、并让新会话落进去走官方 `ctx.workspaces` RPC，不直接改存储。
 */

import { WorktreeController, type WorktreeWorkspaces } from './controller.ts'
import { WorktreeSelector } from './selector.ts'
import { WorktreeBadge } from './badge.ts'

/** Cordis client plugin name（与 host 包同名）。 */
export const name = 'dsh-kit-worktree'

/** 依赖 client 根 context 上的 slots 与官方 workspaces service。 */
export const inject = ['slots', 'workspaces']

interface SlotRegistry {
  inject(name: string, fn: () => unknown): unknown
  register(...args: unknown[]): unknown
}

export function apply(ctx: { get(name: string): unknown }): void {
  const slots = ctx.get('slots') as SlotRegistry | undefined
  if (slots === undefined) return

  const workspaces = ctx.get('workspaces') as WorktreeWorkspaces | undefined
  if (workspaces === undefined) return
  const controller = new WorktreeController(workspaces)

  // 新建会话页：选择当前会话要绑定的 worktree（blank 会话才渲染）。
  slots.inject('conversation.input.dock', () =>
    slots.register({
      name: 'conversation.input.dock',
      id: 'dsh-kit-worktree-selector',
      priority: 10,
      inject: () => ({ controller }),
    }, WorktreeSelector),
  )

  // 会话头部：标注当前对话归属（main / 分支）。
  slots.inject('conversation.session.header.utilities', () =>
    slots.register({
      name: 'conversation.session.header.utilities',
      id: 'dsh-kit-worktree-badge',
      priority: 0,
      inject: () => ({ controller }),
    }, WorktreeBadge),
  )
}
