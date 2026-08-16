/** 侧边栏真毛玻璃（叠层布局：对话铺满整窗，侧边栏浮在其上 + blur）。
 *
 * 官方 frame 是 grid[sidebar|center|details]，且 grid-template-columns 是
 * React inline style。方案：
 *  1. 覆盖 frame 的 grid-template-columns: 0px 1fr 0px !important
 *     （!important 可压过 inline，使 sidebar/details 不占列）
 *  2. sidebarCol 变 position:absolute 浮层（left:0, width=侧栏宽, z-index 高）
 *  3. centerCol 占满整窗，对话内容自然延伸到侧边栏底下
 *  4. sidebarCol 半透明 + backdrop-filter blur → 内容透过侧边栏
 *
 * 设置弹窗打开时（settings-layer.ts 切 open）全部关闭恢复官方布局。
 */

import { attachSettingsLayerFix } from './settings-layer.ts'

const ROOT_CLASS = 'dsh-kit-glass-sidebar'
const STYLE_ID = 'dsh-kit-webui-sidebar-glass'
const WIDTH_VAR = '--dsh-kit-sidebar-width'

const GLASS_CSS = `
.dsh-kit-glass-sidebar .pI_x6G_frame {
  --${WIDTH_VAR}: 280px;
  grid-template-columns: 0px minmax(0, 1fr) 0px !important;
}
/* center 铺满整窗 */
.dsh-kit-glass-sidebar .pI_x6G_centerCol {
  grid-column: 1 / -1;
}
/* sidebar 浮层 */
.dsh-kit-glass-sidebar .pI_x6G_sidebarCol {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(${WIDTH_VAR}, 280px);
  z-index: 5;
  background: color-mix(in srgb, var(--dsw-specific-sidebar-fill) 45%, transparent);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  backdrop-filter: blur(18px) saturate(150%);
}
.dsh-kit-glass-sidebar [data-slot="sidebar"] {
  background: transparent;
}
/* 设置弹窗打开：关闭叠层/毛玻璃，恢复官方布局 */
.dsh-kit-glass-sidebar.dsh-kit-settings-open .pI_x6G_frame {
  grid-template-columns: revert !important;
}
.dsh-kit-glass-sidebar.dsh-kit-settings-open .pI_x6G_centerCol {
  grid-column: revert;
}
.dsh-kit-glass-sidebar.dsh-kit-settings-open .pI_x6G_sidebarCol {
  position: static;
  width: auto;
  z-index: auto;
  background: var(--dsw-specific-sidebar-fill);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
@media (prefers-reduced-motion: reduce) {
  .dsh-kit-glass-sidebar .pI_x6G_sidebarCol {
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }
}
`

/** 安装侧边栏真毛玻璃。幂等。 */
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

  // 侧边栏宽度同步到 root，供浮层宽度 / 设置弹窗读取。
  const col = document.querySelector('.pI_x6G_sidebarCol')
  if (col !== null && typeof ResizeObserver !== 'undefined') {
    const sync = () => {
      const frame = col.parentElement
      if (frame === null) return
      const w = Math.round(col.getBoundingClientRect().width)
      const px = `${Math.max(0, w)}px`
      frame.style.setProperty(WIDTH_VAR, px)
      root.style.setProperty(WIDTH_VAR, px)
    }
    const ro = new ResizeObserver(sync)
    ro.observe(col)
    sync()
  }

  // 设置弹窗打开时关闭叠层/毛玻璃。
  attachSettingsLayerFix()
}
