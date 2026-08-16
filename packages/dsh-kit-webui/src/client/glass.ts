/** 侧边栏毛玻璃材质。
 *
 * 主题 token 只能改颜色，出不了「毛玻璃」。真正的效果 = 半透明背景 +
 * 官方布局侧边栏列上的 backdrop-filter。
 *
 * 透明度不再依赖主题：CSS 用 color-mix 把任意主题的
 * --dsw-specific-sidebar-fill 统一压到 38% 不透明度，因此官方
 * light/dark、dsh-kit 预设、自定义主题全部生效。
 *
 * 官方布局 DOM（dsh rc.6）：
 *   .pI_x6G_frame > .pI_x6G_sidebarCol（背景 = sidebar-fill） > 侧边栏插件根节点
 * 侧边栏插件根节点（.hHd-Xa_root）自带 `background: var(--dsw-specific-sidebar-fill)`。
 * 外层列设为透明并负责 blur，内层用半透明化后的 token 上色。
 */

const ROOT_CLASS = 'dsh-kit-glass-sidebar'
const STYLE_ID = 'dsh-kit-webui-sidebar-glass'

const GLASS_CSS = `
.dsh-kit-glass-sidebar .pI_x6G_sidebarCol {
  background: transparent;
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  backdrop-filter: blur(20px) saturate(160%);
}
.dsh-kit-glass-sidebar [data-slot="sidebar"] {
  background: transparent;
}
.dsh-kit-glass-sidebar .hHd-Xa_root {
  background: var(--dsw-specific-sidebar-fill);
}
@supports (background: color-mix(in srgb, red 50%, transparent)) {
  .dsh-kit-glass-sidebar .hHd-Xa_root {
    background: color-mix(in srgb, var(--dsw-specific-sidebar-fill) 38%, transparent);
  }
}
.dsh-kit-glass-sidebar [data-slot="sidebar"] {
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  backdrop-filter: blur(20px) saturate(160%);
}
@media (prefers-reduced-motion: reduce) {
  .dsh-kit-glass-sidebar .pI_x6G_sidebarCol,
  .dsh-kit-glass-sidebar [data-slot="sidebar"] {
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }
}
`

/** 安装全局毛玻璃样式（根节点打标 + 注入 style）。幂等。 */
export function installSidebarGlass(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (root === null) return
  root.classList.add(ROOT_CLASS)
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = GLASS_CSS
  ;(document.head ?? root).append(style)
}
