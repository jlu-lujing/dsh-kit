/** 侧边栏半透明背景（无 blur、无 z-index）。
 *
 * 之前尝试 backdrop-filter 毛玻璃：必须给侧边栏列加 position/z-index（创建
 * 堆叠上下文），结果把官方 `position:fixed` 的设置弹窗困住、被输入框盖住。
 * 且 DSH 三栏布局里中心内容不会出现在侧边栏底下，blur 本就无物可模糊。
 *
 * 所以只做「半透明背景」：用 color-mix 把 --dsw-specific-sidebar-fill 压到
 * 62% 不透明度，不加任何 position/z-index/backdrop-filter → 完全不影响官方
 * fixed 弹窗的定位与层级。弹窗打开时也无需任何特殊处理。
 */

const ROOT_CLASS = 'dsh-kit-glass-sidebar'
const STYLE_ID = 'dsh-kit-webui-sidebar-glass'

const GLASS_CSS = `
.dsh-kit-glass-sidebar .hHd-Xa_root {
  background: var(--dsw-specific-sidebar-fill);
}
@supports (background: color-mix(in srgb, red 50%, transparent)) {
  .dsh-kit-glass-sidebar .hHd-Xa_root {
    background: color-mix(in srgb, var(--dsw-specific-sidebar-fill) 62%, transparent);
  }
}
`

/** 安装侧边栏半透明背景。幂等。 */
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
}
