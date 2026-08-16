/** 设置弹窗最上层修复。
 *
 * 侧边栏毛玻璃方案给 .pI_x6G_sidebarCol 加了 position:relative; z-index:1，
 * 这会让设置弹窗（.VOzbGW_overlay，position:fixed）被裁/压在输入框之下。
 * 这里用 JS 监听设置弹窗开关，动态切换 root 上的 class：
 *   - 弹窗打开：加 dsh-kit-settings-open → CSS 把侧边栏列层级回退，弹窗回到最上层
 *   - 弹窗关闭：移除 class，恢复毛玻璃侧边栏于内容之上
 * 不受 :has() 浏览器支持影响（相比纯 CSS 更稳）。
 */

const OPEN_CLASS = 'dsh-kit-settings-open'
const OVERLAY_SELECTOR = '.pI_x6G_frame .VOzbGW_overlay'

/** 附加设置弹窗层级修复。幂等。 */
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
