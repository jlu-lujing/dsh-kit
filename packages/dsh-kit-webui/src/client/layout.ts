/** 布局微调（纯 CSS 注入，不动官方源码）。
 *
 * - 去掉左栏与内容区之间分割线的颜色（保留 1px 宽度，避免布局跳动）。
 * - 右侧内容区顶部加一条标题栏：与左栏同色、与右上角控制按钮同高（30px）。
 */

const STYLE_ID = 'dsh-kit-webui-layout-tweaks'
const WIDTH_VAR = '--dsh-kit-sidebar-width'

const LAYOUT_CSS = `
/* 左栏与内容区分割线：透明（无视觉分割线，宽度保留） */
.pI_x6G_sidebarCol {
  border-right-color: transparent !important;
}

/* 右侧顶部标题栏：与左栏同色、与右上角控制按钮同高(30px) */
.dsh-kit-right-titlebar {
  position: fixed;
  top: 0;
  left: var(${WIDTH_VAR}, 280px);
  right: 0;
  height: 30px;
  background: var(--dsw-specific-sidebar-fill);
  z-index: 1000;
  pointer-events: none;
}
/* 右侧内容整体下让 30px，避免被标题栏盖住 */
.pI_x6G_centerCol {
  padding-top: 30px;
}
`
/** 安装布局微调样式。幂等。 */
export function installLayoutTweaks(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (root === null) return
  if (document.getElementById(STYLE_ID) === null) {
    const titlebar = document.createElement('div')
    titlebar.className = 'dsh-kit-right-titlebar'
    document.body.append(titlebar)

    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = LAYOUT_CSS
    ;(document.head ?? root).append(style)
  }

  // 同步侧边栏宽度到 root，供标题栏 left 定位使用。
  const col = document.querySelector('.pI_x6G_sidebarCol')
  if (col === null || typeof ResizeObserver === 'undefined') return
  const sync = () => {
    const w = Math.round(col.getBoundingClientRect().width)
    root.style.setProperty(WIDTH_VAR, `${Math.max(0, w)}px`)
  }
  const ro = new ResizeObserver(sync)
  ro.observe(col)
  sync()
}
