/** dsh-kit-webui host store: 主题定义的权威数据层（JSON 落盘）。 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** 与 client/src/client/themes.ts 的 WebUITheme 同构：tokens 是单值 CSS 字符串（官方 ThemeDefinition 形状）。 */
export interface ThemeRecord {
  id: string
  name: string
  description: string
  colorScheme: 'light' | 'dark'
  builtin: boolean
  tokens: Record<string, string>
}

export interface StoreState {
  /** 全部主题（内置 builtin + 用户自定义）。 */
  themes: ThemeRecord[]
}

function themeFile(stateDir: string): string {
  return join(stateDir, 'dsh-kit-webui/themes.json')
}

export function loadThemes(stateDir: string): ThemeRecord[] {
  try {
    const p = themeFile(stateDir)
    const s = JSON.parse(readFileSync(p, 'utf8')) as StoreState
    if (!Array.isArray(s.themes)) return []
    return s.themes
  } catch {
    return []
  }
}

export function saveThemes(stateDir: string, themes: ThemeRecord[]): void {
  const p = themeFile(stateDir)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify({ themes }, null, 2))
}

export function defaultStateDir(): string {
  return process.env.DSH_HOME ?? `${process.env.HOME ?? '.'}/.dsh`
}
