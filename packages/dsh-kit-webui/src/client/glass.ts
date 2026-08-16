/** 侧边栏毛玻璃材质。
 *
 * 主题 token 只能改颜色，出不了「毛玻璃」。真正的效果 = 半透明
 * --dsw-specific-sidebar-fill（主题层负责）+ 这里给官方布局的侧边栏
 * 列容器加 backdrop-filter。
 *
 * 官方布局 DOM（dsh rc.6）：
 *   .pI_x6G_frame > .pI_x6G_sidebarCol（背景 = sidebar-fill） > 侧边栏插件根节点
 * 侧边栏插件根节点自带 `background: var(--dsw-specific-sidebar-fill)`。
 * 因此把外层列背景设为透明并负责 blur，内层继续用半透明 token 上色，
 * 内容滚动经过左栏时即可透出模糊后的底图。
 */

const BODY_CLASS = 'dsh-kit-glass-sidebar'
const STYLE_ID = 'dsh-kit-webui-sidebar-glass'

const GLASS_CSS = `
.dsh-kit-glass-sidebar .pI_x6G_sidebarCol {
  background: transparent;
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  backdrop-filter: blur(20px) saturate(160%);
}
.dsh-kit-glass-sidebar [data-slot="sidebar"] {
  background: var(--dsw-specific-sidebar-fill);
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

/** 安装全局毛玻璃样式（body 打标 + 注入 style）。幂等。 */
export function installSidebarGlass(): void {
  if (typeof document === 'undefined') return
  document.body.classList.add(BODY_CLASS)
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = GLASS_CSS
  document.head.append(style)
}
