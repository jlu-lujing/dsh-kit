/** 侧边栏毛玻璃材质。
 *
 * ⚠️ 布局约束：不能把 backdrop-filter 加在设置弹窗的任何祖先上。
 * 设置弹窗（.VOzbGW_overlay）用 `position: fixed; inset: 0`，一旦祖先带
 * backdrop-filter（与 filter 一样会变成 fixed 的包含块），弹窗会被裁进
 * 侧边栏里。因此模糊做在「帧的独立玻璃层」上：
 *
 *   .pI_x6G_frame::before   ← 玻璃层（z-index:0，blur），覆盖左栏区域
 *   .pI_x6G_sidebarCol      ← position:relative; z-index:1（压在玻璃层上）
 *   .hHd-Xa_root            ← 半透明背景（color-mix），内容可透出玻璃层
 *
 * 玻璃层宽度用 ResizeObserver 跟随侧边栏列宽（支持拖拽/折叠）。
 */

const ROOT_CLASS = 'dsh-kit-glass-sidebar'
const STYLE_ID = 'dsh-kit-webui-sidebar-glass'
const WIDTH_VAR = '--dsh-kit-sidebar-width'

const GLASS_CSS = `
.dsh-kit-glass-sidebar .pI_x6G_frame {
  --${WIDTH_VAR}: 280px;
}
.dsh-kit-glass-sidebar .pI_x6G_frame::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(${WIDTH_VAR}, 280px);
  z-index: 0;
  pointer-events: none;
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  backdrop-filter: blur(20px) saturate(160%);
}
.dsh-kit-glass-sidebar .pI_x6G_sidebarCol {
  position: relative;
  z-index: 1;
  background: transparent;
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
@media (prefers-reduced-motion: reduce) {
  .dsh-kit-glass-sidebar .pI_x6G_frame::before {
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }
}
`

/** 安装全局毛玻璃样式（根节点打标 + 注入 style + 跟随侧边栏宽度）。幂等。 */
export function installSidebarGlass(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (root === null) return
  root.classList.add(ROOT_CLASS)
  if (document.getElementById(STYLE_ID) === null) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = GLASS_CSS
    ;(document.head ?? root).append(style)
  }

  const col = document.querySelector('.pI_x6G_sidebarCol')
  if (col === null || typeof ResizeObserver === 'undefined') return
  const sync = () => {
    const frame = col.parentElement
    if (frame === null) return
    const w = Math.round(col.getBoundingClientRect().width)
    frame.style.setProperty(WIDTH_VAR, `${Math.max(0, w)}px`)
  }
  const ro = new ResizeObserver(sync)
  ro.observe(col)
  sync()
}
