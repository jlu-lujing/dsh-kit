/** 侧边栏真毛玻璃：让对话内容延伸到侧边栏下，透过半透明 + backdrop-filter 显示。
 *
 * 官方 grid：frame 三列 [sidebar | center | details]。中心列默认 overflow:hidden，
 * 内容不会延伸到侧边栏下。做法：
 *  1. centerCol 负 margin 向左延伸到侧边栏下（宽度用 --dsh-kit-sidebar-width）+ 补回 padding
 *  2. centerCol overflow:hidden→visible（否则被裁）
 *  3. 对话根/背景透明，让下层内容能透到侧边栏
 *  4. sidebarCol 半透明 + backdrop-filter（blur）
 *
 * 注意：blur 加在 sidebarCol 上会和 fixed 弹窗冲突（祖先 filter 会变成 fixed 包含块）。
 * 因此设置弹窗打开时（settings-layer.ts 切 dsh-kit-settings-open）关闭这些布局/背景，
 * 恢复官方原状，弹窗回 viewport 顶层。
 */

const ROOT_CLASS = 'dsh-kit-glass-sidebar'
const STYLE_ID = 'dsh-kit-webui-sidebar-glass'
const WIDTH_VAR = '--dsh-kit-sidebar-width'

const GLASS_CSS = `
.dsh-kit-glass-sidebar .pI_x6G_frame {
  --${WIDTH_VAR}: 280px;
}
/* 中心列延伸到侧边栏下 */
.dsh-kit-glass-sidebar .pI_x6G_centerCol {
  margin-left: calc(-1 * var(${WIDTH_VAR}, 280px));
  padding-left: var(${WIDTH_VAR}, 280px);
  overflow: visible;
}
/* 对话根背景透明，让下层透到侧边栏 */
.dsh-kit-glass-sidebar .wSkVaW_root {
  background: transparent;
}
/* 侧边栏半透明 + 模糊 */
.dsh-kit-glass-sidebar .pI_x6G_sidebarCol {
  background: color-mix(in srgb, var(--dsw-specific-sidebar-fill) 45%, transparent);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  backdrop-filter: blur(18px) saturate(150%);
}
.dsh-kit-glass-sidebar [data-slot="sidebar"] {
  background: transparent;
}
/* 设置弹窗打开：关闭全部相关布局/背景，恢复官方原状 */
.dsh-kit-glass-sidebar.dsh-kit-settings-open .pI_x6G_centerCol {
  margin-left: 0;
  padding-left: 0;
  overflow: hidden;
}
.dsh-kit-glass-sidebar.dsh-kit-settings-open .wSkVaW_root {
  background: var(--dsw-alias-bg-base);
}
.dsh-kit-glass-sidebar.dsh-kit-settings-open .pI_x6G_sidebarCol {
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

  // 侧边栏宽度同步到 root，供 centerCol 负 margin / fixed 弹窗读取。
  const col = document.querySelector('.pI_x6G_sidebarCol')
  if (col !== null && typeof ResizeObserver !== 'undefined') {
    const sync = () => {
      const frame = col.parentElement
      if (frame === null) return
      const w = Math.round(col.getBoundingClientRect().width)
      const px = \`\${Math.max(0, w)}px\`
      frame.style.setProperty(WIDTH_VAR, px)
      root.style.setProperty(WIDTH_VAR, px)
    }
    const ro = new ResizeObserver(sync)
    ro.observe(col)
    sync()
  }

  // 设置弹窗打开时关玻璃/还原，避免 fixed 弹窗被 backdrop-filter 困住。
  attachSettingsLayerFix()
}
