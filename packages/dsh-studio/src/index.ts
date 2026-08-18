/**
 * DSH Studio —— 基于 DeepSeek Harness (dsh) 定制的桌面助手全家桶（单包聚合）。
 *
 * 7 个 dsh-kit* 子包合并为这一个 dsh-studio 包后，所有功能的 host 插件在这里
 * 统一挂载；client 端仍按功能保留子入口（见 src/<feature>/client/）。
 */

import type { Context } from '@deepseek-ai/cordis'

export const name = 'dsh-studio'

/** 合并全部功能的 host apply：目前先挂载 notifier / scheduler。 */
export function apply(ctx: Context): void {
  // notifier（桌面通知）
  // scheduler（定时任务）
  // 后续：webui / worktree / lan-auth / input-history / 聚合底座
}
