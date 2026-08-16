/** 设置弹窗最上层修复。
 *
 * 真毛玻璃给 `.pI_x6G_sidebarCol` 加了 backdrop-filter（会变成 fixed 的
 * 包含块），若设置弹窗打开时不处理，官方 `position:fixed` 弹窗会被困进侧边栏。
 * 这里用 MutationObserver 监听弹窗挂载，切 root 的 `dsh-kit-settings-open`，
 * 由 glass.css 在此时关闭相关布局/背景，恢复官方原状。
 */

const OPEN_CLASS = 'dsh-kit-settings-open'
const OVERLAY_SELECTOR = '.VOzbGW_overlay'

/** 附加设置弹窗最上层修复。幂等。 */
export function attachSettingsLayerFix(): void {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
  const root = document.documentElement
  if (root === null) return

  const sync = () => {
    const open = document.querySelector(OVERLAY_SELECTOR) !== null
    root.classList.toggle(OPEN_CLASS, open)
  }

  const mo = new MutationObserver(sync)
  mo.observe(document, { subtree: true, childList: true })
  sync()
}
