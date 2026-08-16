/** 设置弹窗最上层修复。
 *
 * 设置弹窗（.VOzbGW_overlay，position:fixed; z-index:1000）生成长在侧边栏
 * 内部。毛玻璃为了「毛玻璃」给侧边栏列加了 z-index:1，这会把 fixed 弹窗
 * 困在 z=1 的堆叠上下文里，导致它以侧边栏为包含块、被输入框盖住。
 *
 * 修法（更可靠）：弹窗打开时在 root 切 dsh-kit-settings-open，CSS 把所有
 * 毛玻璃相关覆盖（z-index / backdrop-filter / 半透明背景）全部还原为官方
 * 默认，让 fixed 弹窗重新以 viewport 为包含块、浮到最上层；关闭后恢复毛玻璃。
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
