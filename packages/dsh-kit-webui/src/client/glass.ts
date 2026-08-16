/** 侧边栏毛玻璃材质。
 *
 * 不能在会包含设置弹窗的祖先上放 backdrop-filter（fixed 弹窗会被裁进
 * 侧边栏），因此模糊做在「帧的独立玻璃层」：
 *
 *   .pI_x6G_frame::before   ← 玻璃层（z-index:0，blur），覆盖左栏区域
 *   .pI_x6G_sidebarCol      ← position:relative; z-index:1（压在玻璃层上）
 *   .hHd-Xa_root            ← 半透明背景（color-mix），内容可透出玻璃层
 *
 * 设置弹窗打开时（settings-layer.ts 切 dsh-kit-settings-open），把侧边栏列
 * 抬到 z-index:2000，盖过中心列输入框（z:10），弹窗浮到最上层；关闭后回落。
 * 玻璃层宽度用 ResizeObserver 跟随侧边栏列宽（支持拖拽/折叠）。
 */

import { attachSettingsLayerFix } from './settings-layer.ts'

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
/* 设置弹窗打开时：把侧边栏列抬到 2000，让 fixed 弹窗高于输入框(z:10)。 */
.dsh-kit-glass-sidebar.dsh-kit-settings-open .pI_x6G_frame::before {
  z-index: 2000;
}
.dsh-kit-glass-sidebar.dsh-kit-settings-open .pI_x6G_sidebarCol {
  z-index: 2000;
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

  // 设置弹窗最上层修复：弹窗打开时抬升侧边栏列层级。
  attachSettingsLayerFix()
}
