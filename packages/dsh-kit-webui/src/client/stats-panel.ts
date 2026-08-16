/**
 * dsh-kit-webui 右侧栏「信息」页 —— 实时会话统计。
 *
 * 治本方案：不再克隆/搬动官方 StatsLine 的 DOM（受 hash 类名影响、且克隆不实时），
 * 而是注册进官方 `conversation.composer.dock` 槽位、shadow 掉官方 stats，
 * 用官方标准 kit 提供的 `useProjection` 直接读取 `sessionStats` / `tokenUsage`
 * —— 与官方 StatsLine 同一数据源，跨版本稳定、数据实时更新。
 *
 * 组件本身在 React 树里返回 null（原对话框下方不显示任何东西）；
 * 真正的内容通过 useLayoutEffect / SYNC_EVENT 写进右侧栏「信息」页容器。
 */
import { useEffect, useLayoutEffect, useState } from 'react'

type ProjectionHook = <T = unknown>(
  key: string,
  selector?: (value: unknown) => T,
  eq?: (a: T, b: T) => boolean,
) => T | undefined

export interface StatsPanelEntryProps {
  useProjection: ProjectionHook
}

interface SessionStats {
  turns: number
  steps: number
  llmMs: number
  toolMs: number
  ttftMs: number
  ttftSteps: number
  decodeMs: number
  decodeTokens: number
}

interface TokenUsage {
  uncachedInputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

/** layout.ts 创建右栏容器后派发，提示组件补写最新数据（面板是惰性创建）。 */
export const SYNC_EVENT = 'dsh-kit:stats-sync-request'

const HOLDER_SELECTOR = '.dsh-kit-info-stats'
const NODE_SELECTOR = '[data-dsh-kit-live="stats"]'

/* ── 与官方 StatsLine 一致的格式化工具（conversation 内部私有，这里复刻） ── */

function formatTokensPerSecond(tps: number): string {
  const clamped = Math.max(0, tps)
  return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10)
}

function formatDuration(ms: number): string {
  const s = ms / 1000
  if (s < 60) return `${Math.round(s * 10) / 10}s`
  const whole = Math.round(s)
  return `${Math.floor(whole / 60)}m${whole % 60}s`
}

function formatTokens(n: number): string {
  const scaled = (v: number) => (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10))
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${scaled(n / 1000)}K`
  return `${scaled(n / 1_000_000)}M`
}

function billedInputTokens(usage: TokenUsage): number {
  return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
}

function cacheHitPercent(usage: TokenUsage): number | null {
  const denominator = billedInputTokens(usage)
  return denominator === 0 ? null : Math.round((usage.cacheReadTokens / denominator) * 100)
}

/** 把统计凑成与官方 StatsLine 一致的整行文本。 */
function composeLine(stats: SessionStats | undefined, usage: TokenUsage | undefined): string {
  const groups: string[] = []
  if (stats !== undefined && stats.steps > 0) {
    groups.push(`${stats.turns} 轮 · ${stats.steps} 步`)
    const durations: string[] = []
    if (stats.llmMs > 0) durations.push(`LLM ${formatDuration(stats.llmMs)}`)
    if (stats.toolMs > 0) durations.push(`工具调用 ${formatDuration(stats.toolMs)}`)
    if (durations.length > 0) groups.push(durations.join(' · '))
    const speeds: string[] = []
    if (stats.ttftSteps > 0) speeds.push(`首 token 平均 ${formatDuration(stats.ttftMs / stats.ttftSteps)}`)
    if (stats.decodeMs > 0) speeds.push(`${formatTokensPerSecond(stats.decodeTokens / (stats.decodeMs / 1000))} tok/s`)
    if (speeds.length > 0) groups.push(speeds.join(' · '))
  }
  if (usage !== undefined && (billedInputTokens(usage) > 0 || usage.outputTokens > 0)) {
    const cacheHit = cacheHitPercent(usage)
    if (cacheHit !== null) groups.push(`缓存命中 ${cacheHit}%`)
    groups.push(`输入 ${formatTokens(billedInputTokens(usage))} tok · 输出 ${formatTokens(usage.outputTokens)} tok`)
  }
  return groups.join(' | ')
}

/** 把最新一行写进右侧栏「信息」页容器；容器还不存在则静默跳过。 */
const PLACEHOLDER_SELECTOR = '.dsh-kit-info-empty'

function writeToPanel(line: string): void {
  const holder = document.querySelector<HTMLElement>(HOLDER_SELECTOR)
  if (!holder) return
  // 真正内容出现后移除占位提示。
  holder.querySelectorAll<HTMLElement>(PLACEHOLDER_SELECTOR).forEach((el) => el.remove())
  let node = holder.querySelector<HTMLElement>(NODE_SELECTOR)
  if (!node) {
    node = document.createElement('div')
    node.dataset.dshKitLive = 'stats'
    holder.appendChild(node)
  }
  node.textContent = line !== '' ? line : '暂无会话统计'
}

function StatsPanelEntry(_props: StatsPanelEntryProps): null {
  const useProjection = _props.useProjection
  // syncTick 参与 effect 依赖：面板惰性创建后哪怕数据没变也要补写一次。
  const [syncTick, setSyncTick] = useState(0)

  const stats = useProjection<SessionStats | undefined>('sessionStats')
  const usage = useProjection<TokenUsage | undefined>('tokenUsage')
  const line = composeLine(stats, usage)

  // 监听 layout.ts 派发的“面板就绪”事件：容器出现后立即补写（数据不变也会写）。
  useEffect(() => {
    const onSync = () => {
      writeToPanel(composeLine(stats, usage))
      setSyncTick((x) => x + 1)
    }
    window.addEventListener(SYNC_EVENT, onSync)
    return () => window.removeEventListener(SYNC_EVENT, onSync)
  }, [stats, usage])

  // 数据变化（或 syncTick 变化）时写一次。
  useLayoutEffect(() => {
    writeToPanel(line)
  }, [line, stats, usage, syncTick])

  // 空根：不让官方 slot 在对话框下方渲染任何东西。
  return null
}

export { StatsPanelEntry, SYNC_EVENT }
