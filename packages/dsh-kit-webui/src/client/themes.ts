/**
 * dsh-kit-webui 主题商店 —— 数据层。
 *
 * 分层（严格对齐官方 `@deepseek-ai/dsh-client-ui-theme` 的 API）：
 *
 * 1. 全局界面调整（GlobalLayer）
 *    - 官方 `ctx.theme.overrideTokens(source, tokens)`：tokens 是 `--dsw-alias-*`
 *      → { light, dark } 双值，作为**叠加层**叠在当前激活主题之上。
 *    - 效果：无论用户切到哪个主题（官方 light/dark/system 或本店任意主题），
 *      全局调整始终生效，并且自动跟随浅色/深色模式取对应值。
 *
 * 2. 各主题自己的风格（ThemeDefinition）
 *    - 官方 `ctx.theme.register({ id, colorScheme, tokens })`：tokens 是
 *      `--dsw-alias-*` → 单个 CSS 字符串（不是 {light,dark}，见官方
 *      ThemeDefinition.tokens 类型 ThemeTokens = Record<string,string>）。
 *    - 每个主题通过 `colorScheme: 'light' | 'dark'` 声明自己的基础模式；
 *      为了让同一风格适配深浅色，预设按「家族」提供 dark/light 两个变体。
 *    - `ctx.theme.setTheme(id)` 切换；官方 README 明确三方面板 id 是
 *      in-process 扩展，不写进内置 settings schema → 由本插件自行持久化。
 *
 * 持久化：localStorage（一机一份）；host 侧另有 `/dsh-kit-webui/themes`
 * JSON 落盘（跨浏览器续传）。
 */

/** 全局叠加层的单 token 双模式值（官方 overrideTokens 要求的形状）。 */
export interface TokenModes { light: string; dark: string }

export function pair(light: string, dark: string): TokenModes {
  return { light, dark }
}

/** 官方 ui-theme ThemeRuntime 的本插件子集（全局层 + 主题注册/切换）。 */
export interface ThemeService {
  register(theme: { id: string; colorScheme: 'light' | 'dark'; tokens: Record<string, string> }): () => void
  setTheme(id: string): void
  getTheme(): { preference: string; active: { id: string } }
  overrideTokens(source: string, tokens: Record<string, TokenModes>): () => void
}

/** 一个主题（官方 ThemeDefinition 同构：tokens 是单值，模式由 colorScheme 决定）。 */
export interface WebUITheme {
  id: string
  name: string
  description: string
  colorScheme: 'light' | 'dark'
  builtin: boolean
  /** --dsw-alias-* → CSS 值（该主题自己的风格）。 */
  tokens: Record<string, string>
}

/** 可定制的语义 token 字段（取自官方 BUILTIN_INSPECT_TOKENS 的子集）。 */
export interface TokenField {
  name: string
  label: string
}

export const TOKEN_FIELDS: TokenField[] = [
  { name: '--dsw-alias-bg-base', label: '背景 · 基础' },
  { name: '--dsw-alias-bg-layer-1', label: '背景 · 面板' },
  { name: '--dsw-alias-bg-layer-2', label: '背景 · 嵌套' },
  { name: '--dsw-alias-border-l2', label: '边框' },
  { name: '--dsw-alias-label-primary', label: '文字 · 主' },
  { name: '--dsw-alias-label-secondary', label: '文字 · 次' },
  { name: '--dsw-alias-brand-primary', label: '品牌强调' },
  { name: '--dsw-alias-state-success-primary', label: '成功色' },
  { name: '--dsw-alias-state-error-primary', label: '错误色' },
  { name: '--dsw-alias-state-warn-primary', label: '警告色' },
  { name: '--dsw-specific-sidebar-fill', label: '侧边栏' },
]

/*────────────────────────────── 预设主题 ──────────────────────────────*/
/* 每个家族提供 dark + light 两个变体，保证同一风格适配深浅色。 */

function family(
  key: string,
  name: string,
  darkTokens: Record<string, string>,
  lightTokens: Record<string, string>,
): WebUITheme[] {
  return [
    {
      id: `${key}-dark`,
      name: `${name} · 深色`,
      description: `${name} 风格的深色版`,
      colorScheme: 'dark' as const,
      builtin: true,
      tokens: { ...darkTokens },
    },
    {
      id: `${key}-light`,
      name: `${name} · 浅色`,
      description: `${name} 风格的浅色版`,
      colorScheme: 'light' as const,
      builtin: true,
      tokens: { ...lightTokens },
    },
  ]
}

export const BUILTIN_THEMES: readonly WebUITheme[] = Object.freeze([
  ...family(
    'ocean',
    '海洋 Ocean',
    {
      '--dsw-alias-bg-base': '#0b1220',
      '--dsw-alias-bg-layer-1': '#101b2e',
      '--dsw-alias-bg-layer-2': '#16233a',
      '--dsw-alias-border-l2': '#2a4466',
      '--dsw-alias-label-primary': '#e8eef7',
      '--dsw-alias-label-secondary': '#a7b8d3',
      '--dsw-alias-brand-primary': '#4f9cf9',
      '--dsw-alias-state-success-primary': '#3ecf8e',
      '--dsw-alias-state-error-primary': '#f26d6d',
      '--dsw-alias-state-warn-primary': '#f2b84b',
      '--dsw-specific-sidebar-fill': '#0e1830',
    },
    {
      '--dsw-alias-bg-base': '#f4f8fc',
      '--dsw-alias-bg-layer-1': '#ffffff',
      '--dsw-alias-bg-layer-2': '#e3ecf7',
      '--dsw-alias-border-l2': '#c2d4e8',
      '--dsw-alias-label-primary': '#17273c',
      '--dsw-alias-label-secondary': '#506780',
      '--dsw-alias-brand-primary': '#2f7fd9',
      '--dsw-alias-state-success-primary': '#168a55',
      '--dsw-alias-state-error-primary': '#d94b4b',
      '--dsw-alias-state-warn-primary': '#c98a1f',
      '--dsw-specific-sidebar-fill': '#e7eff8',
    },
  ),
  ...family(
    'sakura',
    '樱 Sakura',
    {
      '--dsw-alias-bg-base': '#140d12',
      '--dsw-alias-bg-layer-1': '#1d1318',
      '--dsw-alias-bg-layer-2': '#2a1b22',
      '--dsw-alias-border-l2': '#4a2e3b',
      '--dsw-alias-label-primary': '#f6e9ee',
      '--dsw-alias-label-secondary': '#d3aeba',
      '--dsw-alias-brand-primary': '#f26d9d',
      '--dsw-alias-state-success-primary': '#4ade80',
      '--dsw-alias-state-error-primary': '#fb7185',
      '--dsw-alias-state-warn-primary': '#fbbf24',
      '--dsw-specific-sidebar-fill': '#170e14',
    },
    {
      '--dsw-alias-bg-base': '#fdf6f8',
      '--dsw-alias-bg-layer-1': '#ffffff',
      '--dsw-alias-bg-layer-2': '#f7e3ea',
      '--dsw-alias-border-l2': '#ecc9d4',
      '--dsw-alias-label-primary': '#3b1f2a',
      '--dsw-alias-label-secondary': '#805564',
      '--dsw-alias-brand-primary': '#d84f83',
      '--dsw-alias-state-success-primary': '#1e9e5a',
      '--dsw-alias-state-error-primary': '#d9435f',
      '--dsw-alias-state-warn-primary': '#c9881f',
      '--dsw-specific-sidebar-fill': '#fbeaf0',
    },
  ),
  ...family(
    'forest',
    '森林 Forest',
    {
      '--dsw-alias-bg-base': '#0f1712',
      '--dsw-alias-bg-layer-1': '#152019',
      '--dsw-alias-bg-layer-2': '#1d2c22',
      '--dsw-alias-border-l2': '#2e4a38',
      '--dsw-alias-label-primary': '#e4f0e6',
      '--dsw-alias-label-secondary': '#a3bdaa',
      '--dsw-alias-brand-primary': '#3fa66a',
      '--dsw-alias-state-success-primary': '#38c172',
      '--dsw-alias-state-error-primary': '#ef6b6b',
      '--dsw-alias-state-warn-primary': '#e2ac3f',
      '--dsw-specific-sidebar-fill': '#122019',
    },
    {
      '--dsw-alias-bg-base': '#f2f8f3',
      '--dsw-alias-bg-layer-1': '#ffffff',
      '--dsw-alias-bg-layer-2': '#e2efe5',
      '--dsw-alias-border-l2': '#c2dcc7',
      '--dsw-alias-label-primary': '#1c2e21',
      '--dsw-alias-label-secondary': '#56715c',
      '--dsw-alias-brand-primary': '#1f8b52',
      '--dsw-alias-state-success-primary': '#157d3f',
      '--dsw-alias-state-error-primary': '#d84040',
      '--dsw-alias-state-warn-primary': '#b97816',
      '--dsw-specific-sidebar-fill': '#e6f1e8',
    },
  ),
])

/*────────────────────────────── 持久化 ──────────────────────────────*/

const LS_KEY = 'dsh-kit-webui.themes.v1'

export interface StoredData {
  /** 用户自建主题（builtin: false）。 */
  custom: WebUITheme[]
  /** 当前选中的主题 id（仅本店主题；官方 light/dark/system 由官方 settings 持久化）。 */
  active: string | null
  /** 全局界面调整层（对所有主题生效；空对象 = 无调整）。 */
  global: Record<string, TokenModes>
}

export function loadStored(): StoredData {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { custom: [], active: null, global: {} }
    const parsed = JSON.parse(raw) as { custom?: unknown; active?: unknown; global?: unknown }
    const custom = Array.isArray(parsed.custom)
      ? (parsed.custom as WebUITheme[]).filter(isThemeLike)
      : []
    const active = typeof parsed.active === 'string' ? parsed.active : null
    const global = isTokenMap(parsed.global) ? (parsed.global as Record<string, TokenModes>) : {}
    return { custom, active, global }
  } catch {
    return { custom: [], active: null, global: {} }
  }
}

export function saveStored(data: StoredData): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  } catch {
    // 隐私模式 / 配额满：静默忽略（主题商店只是增强功能）
  }
}

function isThemeLike(x: unknown): x is WebUITheme {
  const t = x as { id?: unknown; name?: unknown; colorScheme?: unknown; tokens?: unknown }
  return typeof t?.id === 'string' && typeof t?.name === 'string'
    && (t.colorScheme === 'light' || t.colorScheme === 'dark')
    && typeof t.tokens === 'object' && t.tokens !== null
}

function isTokenMap(x: unknown): boolean {
  if (typeof x !== 'object' || x === null) return false
  return Object.values(x as Record<string, unknown>).every((v) =>
    typeof v === 'object' && v !== null
    && typeof (v as { light?: unknown }).light === 'string'
    && typeof (v as { dark?: unknown }).dark === 'string',
  )
}

/**
 * 在全局叠加层中设置某个 token 的一个模式值。
 * 官方 overrideTokens 要求 light/dark 双值：另一模式为空时回填同值，
 * 保证切到该模式时得到合法的 CSS 值（空字符串会让 token 失效）。
 */
export function setTokenMode(
  tokens: Record<string, TokenModes>,
  name: string,
  mode: 'light' | 'dark',
  value: string,
): Record<string, TokenModes> {
  const cur = tokens[name] ?? { light: '', dark: '' }
  const other = mode === 'light' ? 'dark' : 'light'
  const nextOther = cur[other] === '' ? value : cur[other]
  return { ...tokens, [name]: { ...cur, [mode]: value, [other]: nextOther } }
}
