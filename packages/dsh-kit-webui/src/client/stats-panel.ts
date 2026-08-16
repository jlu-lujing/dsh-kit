/**
 * dsh-kit-webui 右侧栏「信息」页 —— 实时会话统计（卡片式展示）。
 *
 * 注册进官方 `conversation.composer.dock` 槽位、shadow 掉官方 StatsLine，
 * 用官方标准 kit 提供的 `useProjection` 直接读取 `sessionStats` / `tokenUsage`
 * —— 与官方 StatsLine 同一数据源，跨版本稳定、数据实时更新。
 *
 * 组件本身在 React 树里返回 null（原对话框下方不显示任何东西）；
 * 真正的内容通过 useLayoutEffect 构建 DOM 写进右侧栏「信息」页容器。
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
const PLACEHOLDER_SELECTOR = '.dsh-kit-info-empty'

/* ── 与官方 StatsLine 一致的格式化工具（conversation 内部私有，这里复刻） ── */

function formatTokensPerSecond(tps: number): string {
  const clamped = Math.max(0, tps)
  return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10)
}

function formatDuration(ms: number): string {
  const s = ms / 1000
  if (s < 60) return `${Math.round(s * 10) / 10}s`
  const whole = Math.round(s)
  const m = Math.floor(whole / 60)
  const rem = whole % 60
  if (m > 0 && rem === 0) return `${m}m`
  return `${m}m${rem}s`
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

/* ── 结构化指标 ── */

interface Metric {
  label: string
  value: string
  /** 可选 accent 主题色 class 后缀。 */
  accent?: 'success' | 'brand' | 'warn'
}

interface StatsModel {
  metrics: Metric[]
  cacheHit: number | null
  hasData: boolean
}

function collectModel(stats: SessionStats | undefined, usage: TokenUsage | undefined, cacheHit: number | null): StatsModel {
  const metrics: Metric[] = []
  if (stats !== undefined && stats.steps > 0) {
    metrics.push({ label: '轮次', value: String(stats.turns), accent: 'brand' })
    metrics.push({ label: '步数', value: String(stats.steps), accent: 'brand' })
    if (stats.llmMs > 0) metrics.push({ label: 'LLM 耗时', value: formatDuration(stats.llmMs) })
    if (stats.toolMs > 0) metrics.push({ label: '工具耗时', value: formatDuration(stats.toolMs) })
    if (stats.ttftSteps > 0) metrics.push({ label: '首 token', value: formatDuration(stats.ttftMs / stats.ttftSteps), accent: 'success' })
    if (stats.decodeMs > 0) {
      metrics.push({ label: '吞吐', value: `${formatTokensPerSecond(stats.decodeTokens / (stats.decodeMs / 1000))} tok/s`, accent: 'success' })
    }
  }
  if (usage !== undefined && (billedInputTokens(usage) > 0 || usage.outputTokens > 0)) {
    metrics.push({ label: '输入', value: `${formatTokens(billedInputTokens(usage))} tok` })
    metrics.push({ label: '输出', value: `${formatTokens(usage.outputTokens)} tok` })
  }
  return {
    metrics,
    cacheHit,
    hasData: metrics.length > 0 || cacheHit !== null,
  }
}

/* ── DOM 构建（纯 createElement，避免 innerHTML / XSS） ── */

function el(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function buildCard(root: HTMLElement, model: StatsModel): void {
  // 清掉旧卡片与占位
  root.querySelectorAll('.dsh-kit-stats-card, .dsh-kit-info-empty').forEach((n) => n.remove())

  if (!model.hasData) {
    const empty = el('div', 'dsh-kit-info-empty', '暂无会话统计')
    root.appendChild(empty)
    return
  }

  const card = el('div', 'dsh-kit-stats-card')

  // 标题行
  const head = el('div', 'dsh-kit-stats-head')
  const headDot = el('span', 'dsh-kit-stats-head-dot')
  headDot.textContent = ''
  head.appendChild(headDot)
  head.appendChild(document.createTextNode('会话统计'))
  card.appendChild(head)

  // 指标瓦片网格
  if (model.metrics.length > 0) {
    const grid = el('div', 'dsh-kit-stats-grid')
    for (const m of model.metrics) {
      const tile = el('div', 'dsh-kit-stat')
      const label = el('div', 'dsh-kit-stat-label', m.label)
      const valueCls = m.accent ? `dsh-kit-stat-value dsh-kit-accent-${m.accent}` : 'dsh-kit-stat-value'
      const value = el('div', valueCls, m.value)
      tile.appendChild(label)
      tile.appendChild(value)
      grid.appendChild(tile)
    }
    card.appendChild(grid)
  }

  // 缓存命中：跨整行的进度条卡片
  if (model.cacheHit !== null) {
    const wide = el('div', 'dsh-kit-stat dsh-kit-stat-wide')
    const row = el('div', 'dsh-kit-stat-widerow')
    const label = el('div', 'dsh-kit-stat-label', '缓存命中')
    const value = el('div', 'dsh-kit-stat-value dsh-kit-accent-success', `${model.cacheHit}%`)
    row.appendChild(label)
    row.appendChild(value)
    const bar = el('div', 'dsh-kit-stat-bar')
    const fill = el('div', 'dsh-kit-stat-bar-fill')
    fill.style.width = `${Math.min(100, Math.max(0, model.cacheHit))}%`
    bar.appendChild(fill)
    wide.appendChild(row)
    wide.appendChild(bar)
    card.appendChild(wide)
  }

  root.appendChild(card)
}

/** 把最新统计写进右侧栏「信息」页容器；容器还不存在则静默跳过。 */
function writeToPanel(stats: SessionStats | undefined, usage: TokenUsage | undefined): void {
  const holder = document.querySelector<HTMLElement>(HOLDER_SELECTOR)
  if (!holder) return
  const cacheHit = usage !== undefined ? cacheHitPercent(usage) : null
  buildCard(holder, collectModel(stats, usage, cacheHit))
}

function StatsPanelEntry(_props: StatsPanelEntryProps): null {
  const useProjection = _props.useProjection
  // syncTick 参与 effect 依赖：面板惰性创建后哪怕数据没变也要补写一次。
  const [syncTick, setSyncTick] = useState(0)

  const stats = useProjection<SessionStats | undefined>('sessionStats')
  const usage = useProjection<TokenUsage | undefined>('tokenUsage')

  // 监听 layout.ts 派发的“面板就绪”事件：容器出现后立即补写（数据不变也会写）。
  useEffect(() => {
    const onSync = () => {
      writeToPanel(stats, usage)
      setSyncTick((x) => x + 1)
    }
    window.addEventListener(SYNC_EVENT, onSync)
    return () => window.removeEventListener(SYNC_EVENT, onSync)
  }, [stats, usage])

  // 数据变化（或 syncTick 变化）时写一次。
  useLayoutEffect(() => {
    writeToPanel(stats, usage)
  }, [stats, usage, syncTick])

  // 空根：不让官方 slot 在对话框下方渲染任何东西。
  return null
}

export { StatsPanelEntry, SYNC_EVENT }
