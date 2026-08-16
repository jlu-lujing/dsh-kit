/** 布局微调（纯 CSS 注入，不动官方源码）。
 *
 * - 去掉左栏与内容区之间分割线的颜色。
 * - 右侧顶部标题栏：官方 conversation header 背景改成左栏同色，形成一条
 *   与右上角控制按钮同高度的顶部标题栏；对话名（crumbs）、mode、worktree
 *   徽标都显示在这条标题栏上。
 */

const STYLE_ID = 'dsh-kit-webui-layout-tweaks'

const LAYOUT_CSS = `
/* 左栏与内容区分割线：透明（无视觉分割线，宽度保留） */
.pI_x6G_sidebarCol {
  border-right-color: transparent !important;
}

/* 右侧顶部标题栏：复用官方 conversation header，背景改为左栏同色 */
.wSkVaW_header {
  background: var(--dsw-specific-sidebar-fill) !important;
  border-bottom-color: transparent !important;
  padding: 8px 20px 0 !important;
}
/* header 底部伪元素分割线去掉，保持纯色标题栏 */
.wSkVaW_header::after {
  display: none !important;
}
`
/** 安装布局微调样式。幂等。 */
export function installLayoutTweaks(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (root === null) return
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = LAYOUT_CSS
  ;(document.head ?? root).append(style)
}
