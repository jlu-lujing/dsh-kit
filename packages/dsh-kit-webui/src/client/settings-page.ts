/** 自建「全屏设置页」——替换对话区，彻底绕开官方 fixed 弹窗的 z 轴问题。
 *
 * 挂在官方 shell.overlay 槽（frame 内全帧覆盖层，overlayLayer z-index:20，
 * 祖先无 backdrop-filter/filter → fixed 定位以视口为基准，天然在内容之上）。
 * 由 sidebar.footer.action 的入口按钮触发：`openSettingsPage()`。
 */

import { createElement, useSyncExternalStore } from 'react'
import type { ThemeStoreController } from './controller.ts'
import { ThemeStorePanel } from './panel.ts'
import { tk, cardS, ghostBtn, primaryBtn } from './ui-style.ts'

/* ─────────────────────────── 模块级开关状态 ─────────────────────────── */

export type SettingsPageTab = 'theme' | 'about'

interface SettingsPageState {
  open: boolean
  tab: SettingsPageTab
}

let state: SettingsPageState = { open: false, tab: 'theme' }
const listeners = new Set<() => void>()

function emit(): void {
  for (const fn of listeners) { try { fn() } catch { /* noop */ } }
}

function getSnapshot(): SettingsPageState { return state }
function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** 打开设置页（可从任意入口调用）。 */
export function openSettingsPage(tab: SettingsPageTab = 'theme'): void {
  state = { open: true, tab }
  emit()
}

/** 关闭设置页，回到对话。 */
export function closeSettingsPage(): void {
  if (!state.open) return
  state = { ...state, open: false }
  emit()
}

let controllerRef: ThemeStoreController | null = null

/** index.ts 在生成控制器后绑定，供设置页渲染主题商店面板。 */
export function bindSettingsPageController(c: ThemeStoreController): void {
  controllerRef = c
}

/* ─────────────────────────── 入口按钮（侧边栏底） ─────────────────────────── */

/** 侧边栏底部「设置页」入口。 */
export function SettingsPageTrigger(): unknown {
  return createElement('button', {
    style: {
      ...ghostBtn,
      display: 'flex', width: '100%', justifyContent: 'flex-start', gap: 8,
      fontSize: 13,
    },
    onClick: () => openSettingsPage('theme'),
    type: 'button',
  }, createElement('span', null, '⚙'), createElement('span', null, '设置页'))
}

/* ─────────────────────────── 全屏覆盖层 ─────────────────────────── */

/** 全屏设置页覆盖层（渲染在 shell.overlay）。关闭时返回 null。 */
export function SettingsPageOverlay(): unknown {
  const s = useSyncExternalStore(subscribe, getSnapshot)
  if (!s.open) return null

  const tabs: Array<{ id: SettingsPageTab; label: string }> = [
    { id: 'theme', label: '主题商店' },
    { id: 'about', label: '关于' },
  ]

  const body = s.tab === 'theme'
    ? (controllerRef
        ? createElement(ThemeStorePanel, { controller: controllerRef })
        : createElement('div', { style: { color: tk.tertiary, padding: 16 } }, '主题商店未就绪…'))
    : createElement('div', { style: { ...cardS, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 } },
        createElement('div', { style: { fontSize: 15, fontWeight: 600 } }, 'dsh-kit-webui'),
        createElement('div', { style: { fontSize: 12, color: tk.secondary, lineHeight: 1.7 } },
          '主题商店插件：全局界面调整 + 每主题独立风格。\n本设置页以整页替换对话区，避免官方弹窗层级问题。）'),
      )

  return createElement('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 1500,
      background: 'var(--dsw-alias-bg-base)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    },
  },
    /* 顶部栏 */
    createElement('div', {
      style: {
        flex: 'none', height: 56, padding: '0 20px',
        borderBottom: '1px solid var(--dsw-alias-border-l2)',
        display: 'flex', alignItems: 'center', gap: 16,
        background: 'var(--dsw-alias-bg-layer-1)',
      },
    },
      createElement('div', { style: { fontSize: 16, fontWeight: 600, flex: 1 } }, '设置'),
      createElement('div', { style: { display: 'flex', gap: 6 } },
        tabs.map((t) =>
          createElement('button', {
            key: t.id,
            style: t.id === s.tab
              ? { ...primaryBtn, fontSize: 13 }
              : { ...ghostBtn, fontSize: 13 },
            onClick: () => { state = { ...state, tab: t.id }; emit() },
            type: 'button',
          }, t.label),
        ),
      ),
      createElement('button', { style: ghostBtn, onClick: closeSettingsPage, type: 'button' }, '✕ 关闭'),
    ),
    /* 内容（滚动） */
    createElement('div', {
      style: {
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '24px 32px 48px',
        display: 'flex', justifyContent: 'center',
      },
    },
      createElement('div', { style: { width: '100%', maxWidth: 920 } }, body),
    ),
  )
}
