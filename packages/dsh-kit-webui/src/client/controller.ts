/** 主题商店生命周期控制器。
 *
 * 关键生命周期：主题注册 / 全局叠加层必须存活在**插件 apply 作用域**，
 * 而不是设置页面组件里——设置页关闭时组件会卸载，若在组件里做 cleanup
 * 会把正在使用的主题注销掉。因此 index.ts 在 apply() 时创建一个
 * ThemeStoreController（整个插件生命周期存活），面板只订阅并调用它。
 */
import {
  BUILTIN_THEMES, loadStored, saveStored,
  type ThemeService, type TokenModes, type WebUITheme,
} from './themes.ts'

const GLOBAL_SOURCE = 'dsh-kit-webui.global'

function mergeThemes(custom: WebUITheme[], fromHost: WebUITheme[]): WebUITheme[] {
  const out: WebUITheme[] = [...BUILTIN_THEMES.map((t) => ({ ...t, tokens: { ...t.tokens } }))]
  const seen = new Set(out.map((t) => t.id))
  for (const t of [...fromHost, ...custom]) {
    if (!t || typeof t.id !== 'string' || seen.has(t.id)) continue
    seen.add(t.id)
    out.push({ ...t, tokens: { ...t.tokens } })
  }
  return out
}

async function fetchHostThemes(): Promise<{
  themes: WebUITheme[]
  active: string | null
  global: Record<string, TokenModes>
}> {
  try {
    const res = await fetch('/dsh-kit-webui/themes')
    if (!res.ok) return { themes: [], active: null, global: {} }
    const data = (await res.json()) as {
      themes?: WebUITheme[]
      active?: string | null
      global?: Record<string, TokenModes>
    }
    return {
      themes: Array.isArray(data.themes) ? data.themes : [],
      active: data.active ?? null,
      global: data.global ?? {},
    }
  } catch {
    return { themes: [], active: null, global: {} }
  }
}

function postHostTheme(theme: WebUITheme): void {
  try {
    fetch('/dsh-kit-webui/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme }),
    }).catch(() => undefined)
  } catch { /* 离线忽略 */ }
}

function postHostDelete(id: string): void {
  try {
    fetch('/dsh-kit-webui/themes/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => undefined)
  } catch { /* 离线忽略 */ }
}

function postHostState(state: { active?: string | null; global?: Record<string, TokenModes> }): void {
  try {
    fetch('/dsh-kit-webui/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).catch(() => undefined)
  } catch { /* 离线忽略 */ }
}

/** 插件生命周期级控制器：主题注册/切换、全局叠加层、持久化。 */
export class ThemeStoreController {
  themes: WebUITheme[] = []
  activeId: string | null = null
  globalTokens: Record<string, TokenModes> = {}
  ready = false

  private readonly disposers: Array<() => void> = []
  private globalDisposer: (() => void) | undefined
  private readonly listeners = new Set<() => void>()

  constructor(private readonly theme?: ThemeService) {}

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(): void {
    for (const fn of this.listeners) {
      try { fn() } catch { /* no-op */ }
    }
  }

  private registerAll(): void {
    if (!this.theme) return
    const previousActive = this.activeId
    for (const d of this.disposers.splice(0)) {
      try { d() } catch { /* no-op */ }
    }
    for (const t of this.themes) {
      try {
        this.disposers.push(this.theme.register({
          id: t.id,
          colorScheme: t.colorScheme,
          tokens: { ...t.tokens },
        }))
      } catch { /* duplicate/invalid: skip */ }
    }
    // 重新注册会短暂触发官方 dispose 的 active 重置，这里恢复本店主题。
    if (previousActive && this.themes.some((t) => t.id === previousActive)) {
      try { this.theme.setTheme(previousActive) } catch { /* ignore */ }
    }
  }

  private persistCustom(): void {
    const stored = loadStored()
    saveStored({ ...stored, custom: this.themes.filter((t) => !t.builtin) })
  }

  /** 启动：恢复本地/远端主题，注册全部主题，应用全局层，恢复 active。 */
  async init(): Promise<void> {
    const stored = loadStored()
    const host = await fetchHostThemes()

    // 选中主题 / 全局层以上收 host 为准（桌面与 LAN 浏览器共享同一份），
    // 本地 localStorage 只兜底首次离线 / 尚未迁移的旧值。
    this.globalTokens = host.global && Object.keys(host.global).length > 0 ? host.global : stored.global
    this.applyGlobalLayer(this.globalTokens)

    this.themes = mergeThemes(stored.custom, host.themes)
    this.registerAll()

    const active = host.active ?? stored.active ?? null
    if (active && this.themes.some((t) => t.id === active)) {
      this.activeId = active
      try { this.theme?.setTheme(active) } catch { /* ignore */ }
      // 若 host 尚未记录这个 active（旧版本只存了本地 localStorage），
      // 现在把用户的选中项同步到 host —— 这样桌面和浏览器（3443/3080）
      // 共享同一份主题，两个入口显示一致。
      if (host.active !== active) postHostState({ active })
    } else {
      this.activeId = this.theme?.getTheme()?.active?.id ?? null
      if (host.active === null && stored.active) {
        // 迁移旧 localStorage 的选中项到 host，让另一入口也能看到。
        // 注意必须是用户存的 stored.active，而不是官方回退的 this.activeId。
        postHostState({ active: stored.active })
      }
    }
    this.ready = true
    this.emit()
  }

  /** 全局界面调整：与主题无关，叠加在任意主题之上。 */
  setGlobal(next: Record<string, TokenModes>): void {
    this.applyGlobalLayer(next)
    const stored = loadStored()
    saveStored({ ...stored, global: next })
    postHostState({ global: next })
    this.emit()
  }

  private applyGlobalLayer(next: Record<string, TokenModes>): void {
    this.globalTokens = next
    if (!this.theme) return
    try {
      this.globalDisposer?.()
      this.globalDisposer = this.theme.overrideTokens(GLOBAL_SOURCE, next)
    } catch { /* ui-theme 不存在时面板只读 */ }
  }

  applyTheme(id: string): void {
    this.activeId = id
    try { this.theme?.setTheme(id) } catch { /* ignore */ }
    const stored = loadStored()
    saveStored({ ...stored, active: id })
    postHostState({ active: id })
    this.emit()
  }

  /** 新建/覆盖一个自定义主题。返回 false 表示 id 与内置预设冲突。 */
  saveCustom(t: WebUITheme): boolean {
    if (BUILTIN_THEMES.some((x) => x.id === t.id)) return false
    const rest = this.themes.filter((x) => !x.builtin && x.id !== t.id)
    this.themes = mergeThemes(rest, [t])
    this.registerAll()
    postHostTheme(t)
    this.persistCustom()
    this.emit()
    return true
  }

  deleteCustom(id: string): void {
    const existed = this.themes.some((t) => t.id === id && !t.builtin)
    if (!existed) return
    this.themes = this.themes.filter((t) => t.id !== id)
    this.registerAll()
    postHostDelete(id)
    if (this.activeId === id) {
      this.activeId = null
      try { this.theme?.setTheme('dark') } catch { /* ignore */ }
    }
    this.persistCustom()
    const stored = loadStored()
    saveStored({ ...stored, active: null })
    postHostState({ active: null })
    this.emit()
  }

  /** 插件卸载时清掉注册与全局层（apply 作用域 dispose）。 */
  dispose(): void {
    for (const d of this.disposers.splice(0)) {
      try { d() } catch { /* no-op */ }
    }
    try { this.globalDisposer?.() } catch { /* no-op */ }
    this.globalDisposer = undefined
    this.listeners.clear()
  }
}
