/**
 * Renderer 入口：启动页 / 错误页 / 状态页。
 * 正常情况下 main 会在 dsh 就绪后 loadURL 覆盖本页；这里只是兜底展示。
 */

const el = document.querySelector('#status')
const detail = document.querySelector('#detail')

const desktop = (window as unknown as { __DSH_DESKTOP__?: { dshUrl?: string } }).__DSH_DESKTOP__

if (el) {
  el.textContent = desktop?.dshUrl
    ? `正在启动 dsh… (${desktop.dshUrl})`
    : '正在启动 dsh…'
}
if (detail) {
  detail.textContent = '若长时间停留在此页，请查看应用日志（用户数据目录 desktop.log）。'
}
