/**
 * dsh-kit-webui, client half —— 主题商店入口。
 *
 * 只做两件事：
 *  1. 从 client Cordis ctx 取官方 `theme` 服务（ui-theme 提供的 ThemeRuntime）；
 *  2. 用自己的 slot id 在官方 UI 旁边注册 `settings.section`「主题商店」面板。
 *
 * 与官方零冲突：slot id 是专属 dsh-kit-webui-themes，不顶替官方单元。
 */
import { createElement } from 'react'
import type { ThemeService } from './themes.ts'
import { ThemeStoreController } from './controller.ts'
import { ThemeStorePanel } from './panel.ts'
import { installSidebarGlass } from './glass.ts'
import {
  bindSettingsPageController, SettingsPageOverlay, SettingsPageTrigger,
} from './settings-page.ts'

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

  // 左侧栏毛玻璃。
  installSidebarGlass()

  // 自建全屏设置页绑定控制器。
  bindSettingsPageController(controller)

  // 侧边栏底部「设置页」入口。
  slots.inject('sidebar.footer.action', () =>
    slots.register(
      { name: 'sidebar.footer.action', id: 'dsh-kit-webui-settings-page', order: 100, label: () => '设置页' },
      () => createElement(SettingsPageTrigger),
    ),
  )

  // 全屏设置页覆盖层（shell.overlay：frame 内全帧覆盖，天然最上层）。
  slots.inject('shell.overlay', () =>
    slots.register(
      { name: 'shell.overlay', id: 'dsh-kit-webui-settings-page', order: 100 },
      () => createElement(SettingsPageOverlay),
    ),
  )

  // 官方设置页「主题商店」面板仍保留（双入口），slot id 专属不冲突。
  slots.inject('settings.section', () =>
    slots.register(
      { name: 'settings.section', id: 'dsh-kit-webui-themes', priority: 40, label: () => '主题商店' },
      () => createElement(ThemeStorePanel, { controller }),
    ),
  )
}
