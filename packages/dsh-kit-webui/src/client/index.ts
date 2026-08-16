/**
 * dsh-kit-webui, client half —— 主题商店入口。
 *
 * 组件职责：
 *  1. 从 client Cordis ctx 取官方 `theme` 服务（ui-theme 提供的 ThemeRuntime）；
 *  2. 用自己的 slot id 在官方设置页注册 `settings.section`「主题商店」面板。
 *
 * 与官方零冲突：slot id 是专属 dsh-kit-webui-themes，不顶替官方单元。
 */
import { createElement } from 'react'
import type { ThemeService } from './themes.ts'
import { ThemeStoreController } from './controller.ts'
import { ThemeStorePanel } from './panel.ts'

export const name = 'dsh-kit-webui'

/** ui-theme 提供 theme 服务；connection 供后续本机/远程差异化。 */
export const inject = ['theme', 'connection']

/*────────────────────────────── 装配 ───────────────────────────────*/
export function apply(ctx: { get(name: string): unknown }): void {
  const slots = ctx.get('slots') as {
    inject(name: string, fn: () => unknown): unknown
    register(...a: unknown[]): unknown
  } | undefined
  if (slots === undefined) return

  const theme = ctx.get('theme') as ThemeService | undefined
  // 控制器在插件 apply 作用域存活，不随设置页开合而注销主题/全局层。
  const controller = new ThemeStoreController(theme)
  void controller.init()

  // 官方设置页「主题商店」面板（id 专属 → 官方设置页多一项）。
  slots.inject('settings.section', () =>
    slots.register(
      { name: 'settings.section', id: 'dsh-kit-webui-themes', priority: 40, label: () => '主题商店' },
      () => createElement(ThemeStorePanel, { controller }),
    ),
  )
}
