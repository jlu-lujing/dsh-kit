/** 整页设置（右侧内容区，替换对话）。
 *
 * 挂在官方 `conversation`（single）槽：文档明确「registering here replaces
 * the entire conversation surface … removes every seat it declares」。因此
 * 动态注册（优先级低于内置 → 成为 winner）即可把对话/输入区整页替换为设置，
 * 而不影响左侧栏（frame 的子席位，与 conversation 同层）。
 *
 * 开关状态存于本模块（root 作用域），入口在侧边栏底部。
 */

import { createElement, useSyncExternalStore } from 'react'
import type { ThemeStoreController } from './controller.ts'
import { ThemeStorePanel } from './panel.ts'
import { tk, cardS, ghostBtn, primaryBtn } from './ui-style.ts'

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

export function openSettingsPage(tab: SettingsPageTab = 'theme'): void {
  state = { open: true, tab }
  emit()
}

export function closeSettingsPage(): void {
  if (!state.open) return
  state = { ...state, open: false }
  emit()
}

let controllerRef: ThemeStoreController | null = null

export function bindSettingsPageController(c: ThemeStoreController): void {
  controllerRef = c
}

/* ─────────────────────────── 入口按钮（侧边栏底） ─────────────────────────── */

export function SettingsPageTrigger(): unknown {
  return createElement('button', {
    style: {
      ...ghostBtn,
      display: 'flex', width: '100%', justifyContent: 'flex-start', gap: 8,
      fontSize: 13,
    },
    onClick: () => openSettingsPage('theme'),
    type: 'button',
  }, createElement('span', null, '🎨'), createElement('span', null, '主题商店'))
}

/* ─────────────────────────── conversation 槽整页 ─────────────────────────── */

/**
 * `conversation` 槽的整页组件。关闭时渲染一个简单空态（占住右侧内容区，
 * 避免 conversation 槽空掉后 frame 布局塌缩）；打开时渲染设置整页。
 */
export function SettingsPageConversation(): unknown {
  const s = useSyncExternalStore(subscribe, getSnapshot)
  if (!s.open) {
    return createElement('div', {
      style: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tk.tertiary },
    }, '点左侧「🎨 主题商店」打开整页设置')
  }

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
          '主题商店插件：全局界面调整 + 每主题独立风格。\n整页设置替换右侧对话区，左侧栏保留。'),
      )

  return createElement('div', {
    style: {
      height: '100%', minWidth: 0,
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

