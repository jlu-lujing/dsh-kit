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

/** 右侧面板图标（与左侧 IconPanelLeftOutline16 对称：面板靠右、箭头向右拨）。 */
function rightPanelSvg(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M2 2.5C1.17 2.5 .5 3.17.5 4V12C.5 12.83 1.17 13.5 2 13.5H9C9.83 13.5 10.5 12.83 10.5 12V4C10.5 3.17 9.83 2.5 9 2.5H2ZM2 4H9V12H2V4ZM17.5 4C17.5 3.17 16.83 2.5 16 2.5H15.5V4H16V12H15.5V13.5H16C16.83 13.5 17.5 12.83 17.5 12V4ZM13.5 7.5H11.5V8.5H13.5V11L15.5 8L13.5 5V7.5Z" fill="currentColor"/>
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
