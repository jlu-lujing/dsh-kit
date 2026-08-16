/** 布局微调（纯 CSS 注入，不动官方源码）。
 *
 * - 去掉左栏与内容区之间分割线的颜色。
 * - 右侧顶部标题栏：官方 conversation header 背景改成左栏同色，横贯全窗。
 * - 右侧栏改为「内容区内覆盖式分栏」（仿官方轨迹 trajectory 的 details）：
 *   标题栏贯穿不动，右侧面板在内容区从右向左滑入，覆盖在内容之上。
 */

const STYLE_ID = 'dsh-kit-webui-layout-tweaks'

const LAYOUT_CSS = `
/* 左栏与内容区分割线：透明（无视觉分割线，宽度保留） */
.pI_x6G_sidebarCol {
  border-right-color: transparent !important;
}

/* 禁用官方右侧 grid 列：让 center 占满全宽，标题栏得以贯通 */
.pI_x6G_detailsCol {
  display: none !important;
}

/* 右侧顶部标题栏：横贯全窗（center 占满后即全宽），左栏同色 */
.wSkVaW_header {
  background: var(--dsw-specific-sidebar-fill) !important;
  border-bottom-color: transparent !important;
  padding: 8px 20px 0 !important;
}
.wSkVaW_header::after {
  display: none !important;
}

/* 内容区定位上下文（用于右侧覆盖面板绝对定位） */
.wSkVaW_root {
  position: relative;
}

/* 右侧覆盖面板：内容区内从右往左滑入，标题栏下方开始 */
.dsh-kit-right-panel {
  position: absolute;
  top: var(--dsh-kit-titlebar-height, 0px);
  right: 0;
  bottom: 0;
  width: clamp(320px, 36%, 440px);
  background: var(--dsw-alias-bg-layer-1);
  border-left: 1px solid var(--dsw-alias-border-l2);
  box-shadow: -12px 0 32px rgba(0, 0, 0, 0.18);
  transform: translateX(102%);
  transition: transform 0.22s var(--ds-ease-in-out, ease-in-out);
  z-index: 30;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
.dsh-kit-right-panel.is-open {
  transform: translateX(0);
}
.dsh-kit-right-panel-header {
  flex: none;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 14px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  font-size: 14px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}
.dsh-kit-right-panel-close {
  width: 28px;
  height: 28px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dsh-kit-right-panel-close:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-kit-right-panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
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
.dsh-kit-right-toggle:hover,
.dsh-kit-right-toggle[aria-pressed="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
}
/* win/linux：左移避让右上角三按钮（与官方 headerUtilities 同宽度让位） */
body:not([data-dsh-platform="darwin"]) .dsh-kit-right-toggle {
  margin-right: 128px;
}
`

/** 右侧面板图标 = 左侧 IconPanelLeftOutline16 的水平镜像（createElementNS 构建，可靠）。 */
const SVG_NS = 'http://www.w3.org/2000/svg'
function svgIcon(elem: Document, d: string): SVGSVGElement {
  const svg = elem.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('fill', 'none')
  const g = elem.createElementNS(SVG_NS, 'g')
  g.setAttribute('transform', 'scale(-1,1) translate(-16,0)')
  const path = elem.createElementNS(SVG_NS, 'path')
  path.setAttribute('fill-rule', 'evenodd')
  path.setAttribute('clip-rule', 'evenodd')
  path.setAttribute('d', d)
  path.setAttribute('fill', 'currentColor')
  g.appendChild(path)
  svg.appendChild(g)
  return svg
}

/** IconPanelLeftOutline16 的原始 path（取自官方 primitives）。 */
const LEFT_PANEL_PATH = 'M9.67272 0.522841C10.8339 0.522841 11.76 0.522714 12.4963 0.602493C13.2453 0.683657 13.8789 0.854248 14.4264 1.25197C14.7504 1.48739 15.0355 1.77247 15.2709 2.0965C15.6686 2.64394 15.8392 3.27758 15.9204 4.02655C16.0002 4.7629 16 5.68895 16 6.85014V9.14986C16 10.3111 16.0002 11.2371 15.9204 11.9735C15.8392 12.7224 15.6686 13.3561 15.2709 13.9035C15.0355 14.2275 14.7504 14.5126 14.4264 14.748C13.8789 15.1458 13.2453 15.3163 12.4963 15.3975C11.76 15.4773 10.8339 15.4772 9.67272 15.4772H6.3273C5.16611 15.4772 4.24006 15.4773 3.50371 15.3975C2.75474 15.3163 2.1211 15.1458 1.57366 14.748C1.24963 14.5126 0.964549 14.2275 0.729131 13.9035C0.331407 13.3561 0.160817 12.7224 0.0796529 11.9735C-0.000126137 11.2371 1.25338e-09 10.3111 1.25338e-09 9.14986V6.85014C1.25329e-09 5.68895 -0.000126137 4.7629 0.0796529 4.02655C0.160817 3.27758 0.331407 2.64394 0.729131 2.0965C0.964549 1.77247 1.24963 1.48739 1.57366 1.25197C2.1211 0.854248 2.75474 0.683657 3.50371 0.602493C4.24006 0.522714 5.16611 0.522841 6.3273 0.522841H9.67272ZM5.54303 1.88715V14.1118C5.78636 14.1128 6.04709 14.1169 6.3273 14.1169H9.67272C10.8639 14.1169 11.7032 14.1164 12.3493 14.0465C12.9824 13.9779 13.3497 13.8494 13.6268 13.6482C13.8354 13.4966 14.0195 13.3125 14.1711 13.1039C14.3723 12.8268 14.5007 12.4595 14.5693 11.8264C14.6393 11.1803 14.6398 10.341 14.6398 9.14986V6.85014C14.6398 5.65896 14.6393 4.81967 14.5693 4.1736C14.5007 3.54048 14.3723 3.17318 14.1711 2.89609C14.0195 2.68747 13.8354 2.50337 13.6268 2.35179C13.3497 2.1506 12.9824 2.02212 12.3493 1.95353C11.7032 1.88358 10.8639 1.88307 9.67272 1.88307H6.3273C6.04709 1.88307 5.78636 1.8862 5.54303 1.88715ZM4.1828 1.91166C3.99125 1.9216 3.8148 1.93577 3.65076 1.95353C3.01764 2.02212 2.65034 2.1506 2.37325 2.35179C2.16463 2.50337 1.98052 2.68747 1.82895 2.89609C1.62776 3.17318 1.49928 3.54048 1.43069 4.1736C1.36074 4.81967 1.36023 5.65896 1.36023 6.85014V9.14986C1.36023 10.341 1.36074 11.1803 1.43069 11.8264C1.49928 12.4595 1.62776 12.8268 1.82895 13.1039C1.98052 13.3125 2.16463 13.4966 2.37325 13.6482C2.65034 13.8494 3.01764 13.9779 3.65076 14.0465C3.81478 14.0642 3.99127 14.0774 4.1828 14.0873V1.91166Z'

function xIcon(elem: Document): SVGSVGElement {
  const svg = elem.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '14')
  svg.setAttribute('height', '14')
  svg.setAttribute('viewBox', '0 0 14 14')
  svg.setAttribute('fill', 'none')
  const path = elem.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', 'M3 3l8 8M11 3L3 11')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '1.2')
  path.setAttribute('stroke-linecap', 'round')
  svg.appendChild(path)
  return svg
}

interface LayoutLike {
  openDetails: () => void
  closeDetails: () => void
}

/** 安装布局微调样式。幂等。 */
export function installLayoutTweaks(_layout?: LayoutLike): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (root === null) return
  if (document.getElementById(STYLE_ID) === null) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = LAYOUT_CSS
    ;(document.head ?? root).append(style)
  }

  // 同步标题栏高度到 root。
  const syncTitlebar = () => {
    const header = document.querySelector('.wSkVaW_header')
    const h = header ? Math.round(header.getBoundingClientRect().height) : 0
    root.style.setProperty('--dsh-kit-titlebar-height', `${Math.max(0, h)}px`)
  }
  syncTitlebar()
  if (typeof ResizeObserver !== 'undefined') {
    const tryObserve = () => {
      const header = document.querySelector('.wSkVaW_header')
      if (header === null) return false
      const ro = new ResizeObserver(syncTitlebar)
      ro.observe(header)
      syncTitlebar()
      return true
    }
    if (!tryObserve()) {
      const mo = new MutationObserver(() => { if (tryObserve()) mo.disconnect() })
      mo.observe(document.body, { childList: true, subtree: true })
    }
  }

  // 创建右侧覆盖面板（懒创建，单例）。
  const ensurePanel = (): HTMLElement | null => {
    let panel = document.querySelector('.dsh-kit-right-panel') as HTMLElement | null
    if (panel !== null) return panel
    const rootEl = document.querySelector('.wSkVaW_root')
    if (rootEl === null) return null
    panel = document.createElement('div')
    panel.className = 'dsh-kit-right-panel'
    const header = document.createElement('div')
    header.className = 'dsh-kit-right-panel-header'
    const title = document.createElement('span')
    title.textContent = '右侧面板'
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'dsh-kit-right-panel-close'
    close.setAttribute('aria-label', '关闭右侧面板')
    close.appendChild(xIcon(document))
    close.addEventListener('click', () => setOpen(false))
    header.appendChild(title)
    header.appendChild(close)
    const body = document.createElement('div')
    body.className = 'dsh-kit-right-panel-body'
    body.textContent = '右侧面板内容占位。'
    panel.appendChild(header)
    panel.appendChild(body)
    rootEl.appendChild(panel)
    return panel
  }

  const toggleBtn = () => document.querySelector('.dsh-kit-right-toggle') as HTMLButtonElement | null

  const setOpen = (open: boolean) => {
    const panel = ensurePanel()
    if (panel === null) return
    panel.classList.toggle('is-open', open)
    const btn = toggleBtn()
    if (btn) btn.setAttribute('aria-pressed', open ? 'true' : 'false')
  }
  const toggle = () => {
    const panel = document.querySelector('.dsh-kit-right-panel')
    setOpen(!(panel?.classList.contains('is-open') ?? false))
  }

  // 标题栏右侧折叠按钮 + 右栏展开。
  const mountToggle = () => {
    if (document.querySelector('.dsh-kit-right-toggle') !== null) return
    const header = document.querySelector('.wSkVaW_header')
    if (header === null) return
    const titleRow = header.querySelector('.wSkVaW_titleRow')
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'dsh-kit-right-toggle'
    btn.setAttribute('aria-label', '折叠/展开右侧边栏')
    btn.title = '右侧边栏'
    btn.appendChild(svgIcon(document, LEFT_PANEL_PATH))
    btn.addEventListener('click', toggle)
    const host = titleRow ?? header
    host.appendChild(btn)
    syncTitlebar()
  }
  mountToggle()

  if (typeof MutationObserver === 'undefined') return
  const mo = new MutationObserver(mountToggle)
  mo.observe(document.body, { childList: true, subtree: true })
}
