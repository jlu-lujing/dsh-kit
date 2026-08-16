/** 设置弹窗最上层修复。
 *
 * 设置弹窗（.VOzbGW_overlay，position:fixed; z-index:1000）生成长在侧边栏
 * 内部。毛玻璃给侧边栏列加了 z-index:1 → 设置弹窗被困在 z=1 的堆叠上下文里，
 * 于是被中心列里 z-index:10 的输入框盖住。
 *
 * 修法：弹窗打开时在 root 切 dsh-kit-settings-open，CSS 把侧边栏列抬到
 * z-index:2000，让弹窗整体高于输入框；关闭后回落 z-index:1。毛玻璃保持。
 */

const OPEN_CLASS = 'dsh-kit-settings-open'
const OVERLAY_SELECTOR = '.pI_x6G_frame .VOzbGW_overlay'

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
