/** 布局微调（纯 CSS 注入，不动官方源码）。
 *
 * - 去掉左栏与内容区之间分割线的颜色。
 * - 右侧顶部标题栏：官方 conversation header 背景改成左栏同色，横贯全窗
 *   （含右侧详情列上方；顶部用左栏同色填充，视觉贯通）。
 * - 右侧边栏：官方 details 列（挤占式，展开时把中间内容区往左挤），
 *   标题栏折叠按钮调用官方 ctx.layout 的 openDetails()/closeDetails()。
 */

const STYLE_ID = 'dsh-kit-webui-layout-tweaks'

const LAYOUT_CSS = `
/* 左栏与内容区分割线：透明（无视觉分割线，宽度保留） */
.pI_x6G_sidebarCol {
  border-right-color: transparent !important;
}

/* 左栏 logo 行隐藏：logo 与折叠按钮已移到标题栏，左栏从新会话开始 */
.pI_x6G_sidebarCol .hHd-Xa_logoRow,
.pI_x6G_sidebarCol [class*="logoRow"] {
  display: none !important;
}
.pI_x6G_sidebarCol button {
  position: relative;
  z-index: 100;
}

/* 标题栏左侧：logo + 左折叠按钮 */
.dsh-kit-titlebar-logo {
  flex: none;
  font-size: 15px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
  margin-right: 6px;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
}
.dsh-kit-left-toggle {
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
  margin-right: 14px;
}
.dsh-kit-left-toggle:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

/* 顶部标题栏：fixed 贯穿整窗（跨左栏+内容区），高度对齐左栏 logo 行 60px */
.wSkVaW_header {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 2147483000 !important;
  height: 60px !important;
  padding: 0 20px !important;
  box-sizing: border-box;
  background: var(--dsw-specific-sidebar-fill) !important;
  border-bottom-color: transparent !important;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
/* 下方 frame 整体下移避开 fixed 标题栏；用 height+margin 而非 padding，
   避免 grid 高度超出视口把底部输入框挤出屏幕 */
.pI_x6G_frame {
  box-sizing: border-box;
  height: calc(100% - 60px) !important;
  margin-top: 60px;
}
.wSkVaW_header .wSkVaW_titleRow {
  min-height: 0;
}
.wSkVaW_header::after {
  display: none !important;
}

/* 禁用官方窗口层右侧 grid 列：右栏由我们放内容区内 */
.pI_x6G_detailsCol {
  display: none !important;
}

/* 取消顶部「对话/轨迹」标签切换器：整个中间区域都是对话 */
.wSkVaW_tabs {
  display: none !important;
}

/* 内容区定位上下文（右栏 absolute 用） */
.wSkVaW_root {
  position: relative;
}

/* 滑动过渡时长（收起时更明显，稍慢一点） */
.wSkVaW_root {
  --dsh-kit-right-slow: 0.28s;
  --dsh-kit-right-ease: var(--ds-ease-in-out, ease-in-out);
}

/* 右侧栏展开时：对话滚动区往左挤窄，并平滑过渡（模拟左栏 grid 动画） */
.wSkVaW_scrollBody {
  transition: margin-right var(--dsh-kit-right-slow) var(--dsh-kit-right-ease);
}
.wSkVaW_root.dsh-kit-right-open .wSkVaW_scrollBody {
  margin-right: var(--dsh-kit-right-width, 320px);
}

/* 右侧栏：内容区内、标题栏下方、右缘贴内容区；transform 滑入/滑出。
   visibility 用延迟过渡：展开立即可见，收起等 transform 滑出后再隐藏，
   这样收起的滑出动画不会被 visibility:hidden 立即吞掉。 */
.dsh-kit-right-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--dsh-kit-right-width, 320px);
  background: var(--dsw-alias-bg-layer-1);
  border-left: 1px solid var(--dsw-alias-border-l2);
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  transform: translateX(102%);
  transition:
    transform var(--dsh-kit-right-slow) var(--dsh-kit-right-ease),
    visibility 0s linear var(--dsh-kit-right-slow);
  visibility: hidden;
  pointer-events: none;
}
.wSkVaW_root.dsh-kit-right-open .dsh-kit-right-panel {
  transform: translateX(0);
  visibility: visible;
  pointer-events: auto;
  transition:
    transform var(--dsh-kit-right-slow) var(--dsh-kit-right-ease),
    visibility 0s;
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

const LEFT_PANEL_PATH = 'M9.67272 0.522841C10.8339 0.522841 11.76 0.522714 12.4963 0.602493C13.2453 0.683657 13.8789 0.854248 14.4264 1.25197C14.7504 1.48739 15.0355 1.77247 15.2709 2.0965C15.6686 2.64394 15.8392 3.27758 15.9204 4.02655C16.0002 4.7629 16 5.68895 16 6.85014V9.14986C16 10.3111 16.0002 11.2371 15.9204 11.9735C15.8392 12.7224 15.6686 13.3561 15.2709 13.9035C15.0355 14.2275 14.7504 14.5126 14.4264 14.748C13.8789 15.1458 13.2453 15.3163 12.4963 15.3975C11.76 15.4773 10.8339 15.4772 9.67272 15.4772H6.3273C5.16611 15.4772 4.24006 15.4773 3.50371 15.3975C2.75474 15.3163 2.1211 15.1458 1.57366 14.748C1.24963 14.5126 0.964549 14.2275 0.729131 13.9035C0.331407 13.3561 0.160817 12.7224 0.0796529 11.9735C-0.000126137 11.2371 1.25338e-09 10.3111 1.25338e-09 9.14986V6.85014C1.25329e-09 5.68895 -0.000126137 4.7629 0.0796529 4.02655C0.160817 3.27758 0.331407 2.64394 0.729131 2.0965C0.964549 1.77247 1.24963 1.48739 1.57366 1.25197C2.1211 0.854248 2.75474 0.683657 3.50371 0.602493C4.24006 0.522714 5.16611 0.522841 6.3273 0.522841H9.67272ZM5.54303 1.88715V14.1118C5.78636 14.1128 6.04709 14.1169 6.3273 14.1169H9.67272C10.8639 14.1169 11.7032 14.1164 12.3493 14.0465C12.9824 13.9779 13.3497 13.8494 13.6268 13.6482C13.8354 13.4966 14.0195 13.3125 14.1711 13.1039C14.3723 12.8268 14.5007 12.4595 14.5693 11.8264C14.6393 11.1803 14.6398 10.341 14.6398 9.14986V6.85014C14.6398 5.65896 14.6393 4.81967 14.5693 4.1736C14.5007 3.54048 14.3723 3.17318 14.1711 2.89609C14.0195 2.68747 13.8354 2.50337 13.6268 2.35179C13.3497 2.1506 12.9824 2.02212 12.3493 1.95353C11.7032 1.88358 10.8639 1.88307 9.67272 1.88307H6.3273C6.04709 1.88307 5.78636 1.8862 5.54303 1.88715ZM4.1828 1.91166C3.99125 1.9216 3.8148 1.93577 3.65076 1.95353C3.01764 2.02212 2.65034 2.1506 2.37325 2.35179C2.16463 2.50337 1.98052 2.68747 1.82895 2.89609C1.62776 3.17318 1.49928 3.54048 1.43069 4.1736C1.36074 4.81967 1.36023 5.65896 1.36023 6.85014V9.14986C1.36023 10.341 1.36074 11.1803 1.43069 11.8264C1.49928 12.4595 1.62776 12.8268 1.82895 13.1039C1.98052 13.3125 2.16463 13.4966 2.37325 13.6482C2.65034 13.8494 3.01764 13.9779 3.65076 14.0465C3.81478 14.0642 3.99127 14.0774 4.1828 14.0873V1.91166Z'

/** 安装布局微调样式。幂等。 */
export function installLayoutTweaks(layout?: { toggleSidebar: () => void }): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (root === null) return
  if (document.getElementById(STYLE_ID) === null) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = LAYOUT_CSS
    ;(document.head ?? root).append(style)
  }

  // 同步标题栏高度到 root（供 details 列顶部填充使用）。
  const syncTitlebar = () => {
    const header = document.querySelector('.wSkVaW_header')
    const h = header ? Math.round(header.getBoundingClientRect().height) : 0
    root.style.setProperty('--dsh-kit-titlebar-height', `${Math.max(0, h)}px`)
  }
  syncTitlebar()

  // 移除历史残留的全屏拖拽条（.dshkit-dragbar），避免挡住左栏顶部按钮。
  document.querySelectorAll('.dshkit-dragbar').forEach((el) => el.remove())
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

  // 构建内容区内的右侧栏（懒创建，单例）。
  const ensurePanel = (): HTMLElement | null => {
    let panel = document.querySelector('.dsh-kit-right-panel') as HTMLElement | null
    if (panel !== null) return panel
    const contentRoot = document.querySelector('.wSkVaW_root')
    if (contentRoot === null) return null
    panel = document.createElement('div')
    panel.className = 'dsh-kit-right-panel'
    const header = document.createElement('div')
    header.className = 'dsh-kit-right-panel-header'
    const title = document.createElement('span')
    title.textContent = '右侧栏'
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'dsh-kit-right-panel-close'
    close.textContent = '✕'
    close.setAttribute('aria-label', '关闭右侧栏')
    close.addEventListener('click', () => setOpen(false))
    header.appendChild(title)
    header.appendChild(close)
    const body = document.createElement('div')
    body.className = 'dsh-kit-right-panel-body'
    body.textContent = '右侧栏内容占位。'
    panel.appendChild(header)
    panel.appendChild(body)
    contentRoot.appendChild(panel)
    return panel
  }

  const toggleBtn = () => document.querySelector('.dsh-kit-right-toggle') as HTMLButtonElement | null

  const setOpen = (open: boolean) => {
    const panel = ensurePanel()
    if (panel === null) return
    const contentRoot = document.querySelector('.wSkVaW_root')
    const btn = toggleBtn()
    const apply = () => {
      if (contentRoot) contentRoot.classList.toggle('dsh-kit-right-open', open)
      if (btn) btn.setAttribute('aria-pressed', open ? 'true' : 'false')
    }
    const panelEl = panel as HTMLElement & { __dshkitInited?: boolean }
    if (open && !panelEl.__dshkitInited) {
      // 首次：先确保处于收起态（transform 有初始值），下一帧再展开 → 首次也有动画
      panelEl.__dshkitInited = true
      if (contentRoot) contentRoot.classList.remove('dsh-kit-right-open')
      requestAnimationFrame(() => requestAnimationFrame(apply))
    } else {
      apply()
    }
  }
  const toggle = () => {
    const contentRoot = document.querySelector('.wSkVaW_root')
    const open = contentRoot?.classList.contains('dsh-kit-right-open') ?? false
    setOpen(!open)
  }

  // 标题栏右侧折叠按钮。
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

  // 标题栏左侧 logo + 左折叠按钮（自己创建，控制 layout.toggleSidebar）。
  // 不再迁移官方 DOM，避免折叠态 React 重渲染导致图标丢失/无法展开。
  const mountLeftToggle = () => {
    if (typeof layout === 'undefined') return
    if (document.querySelector('.dsh-kit-left-toggle') !== null) return
    const header = document.querySelector('.wSkVaW_header')
    const titleRow = header ? header.querySelector('.wSkVaW_titleRow') : null
    if (!titleRow) return

    // logo：clone 官方 brand 的 SVG（唯一一次，折叠态不重取），保持真实官方 logo
    const logo = document.createElement('button')
    logo.type = 'button'
    logo.className = 'dsh-kit-titlebar-logo'
    const brand = document.querySelector<HTMLElement>('.hHd-Xa_brand')
    const brandSvg = brand ? brand.querySelector('svg') : null
    if (brandSvg) {
      logo.appendChild(brandSvg.cloneNode(true) as Element)
    } else {
      logo.textContent = 'dsh-kit'
    }
    logo.title = '新建会话'
    logo.addEventListener('click', () => layout.toggleSidebar())

    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = 'dsh-kit-left-toggle'
    toggle.setAttribute('aria-label', '折叠/展开左侧边栏')
    toggle.title = '左侧边栏'
    toggle.appendChild(svgIcon(document, LEFT_PANEL_PATH))
    toggle.addEventListener('click', () => layout.toggleSidebar())

    titleRow.insertBefore(toggle, titleRow.firstChild)
    titleRow.insertBefore(logo, titleRow.firstChild)
  }
  mountLeftToggle()

  if (typeof MutationObserver === 'undefined') return
  const mo = new MutationObserver(() => {
    mountToggle()
    mountLeftToggle()
  })
  mo.observe(document.body, { childList: true, subtree: true })
}
