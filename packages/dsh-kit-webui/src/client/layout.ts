/** 布局微调（纯 CSS 注入，不动官方源码）。
 *
 * - 去掉左栏与内容区之间分割线的颜色。
 * - 右侧顶部标题栏：官方 conversation header 背景改成左栏同色。
 * - 右侧边栏折叠/展开按钮：与左侧折叠按钮对称，放在标题栏右侧，
 *   调用官方 ctx.layout 的 openDetails()/closeDetails()。
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
.wSkVaW_header::after {
  display: none !important;
}

/* 右侧边栏折叠/展开按钮：标题栏最右侧、与左侧折叠按钮对称 */
.dsh-kit-right-toggle {
  cursor: pointer;
  width: 28px;
  height: 28px;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  border: none;
  border-radius: 50%;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
}
.dsh-kit-right-toggle:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
`

/** 右侧面板图标 = 左侧 IconPanelLeftOutline16 的水平镜像（完全对称）。 */
function rightPanelSvg(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="scale(-1,1) translate(-16,0)">
    <path fill-rule="evenodd" clip-rule="evenodd" d="${d}" fill="currentColor"/>
  </g>
</svg>`
}

interface LayoutLike {
  openDetails: () => void
  closeDetails: () => void
}

/** 安装布局微调样式。幂等。 */
export function installLayoutTweaks(layout?: LayoutLike): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (root === null) return
  if (document.getElementById(STYLE_ID) === null) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = LAYOUT_CSS
    ;(document.head ?? root).append(style)
  }

  // 右侧边栏折叠/展开按钮（注入到右侧标题栏）。
  const mountToggle = () => {
    if (typeof layout === 'undefined') return
    if (document.querySelector('.dsh-kit-right-toggle') !== null) return
    const header = document.querySelector('.wSkVaW_header')
    if (header === null) return
    const titleRow = header.querySelector('.wSkVaW_titleRow')

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'dsh-kit-right-toggle'
    btn.setAttribute('aria-label', '折叠/展开右侧边栏')
    btn.title = '右侧边栏'
    btn.innerHTML = rightPanelSvg()
    btn.addEventListener('click', () => {
      const frame = document.querySelector('.pI_x6G_frame')
      const collapsed = frame?.getAttribute('data-details-collapsed') !== null
      if (collapsed) layout.openDetails()
      else layout.closeDetails()
    })
    // 插到标题栏最上面一排（titleRow）末尾，与左侧折叠按钮同排对称。
    const host = titleRow ?? header
    host.appendChild(btn)
  }
  mountToggle()

  if (typeof MutationObserver === 'undefined') return
  const mo = new MutationObserver(mountToggle)
  mo.observe(document.body, { childList: true, subtree: true })
}
