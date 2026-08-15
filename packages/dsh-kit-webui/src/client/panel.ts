/** 主题商店设置页面板：全局界面调整 + 主题风格（预设/自定义）两部分。 */
import { createElement, useEffect, useState } from 'react'
import type { WebUITheme } from './themes.ts'
import { tk, cardS, primaryBtn } from './ui-style.ts'
import { ThemeCard } from './ui-card.ts'
import { ThemeEditor, GlobalAdjuster } from './ui-editor.ts'
import type { ThemeStoreController } from './controller.ts'

type View =
  | { kind: 'grid' }
  | { kind: 'create' }
  | { kind: 'edit'; theme: WebUITheme }

export function ThemeStorePanel({ controller }: { controller: ThemeStoreController }) {
  const [, force] = useState(0)
  const [view, setView] = useState<View>({ kind: 'grid' })

  useEffect(() => controller.subscribe(() => force((x) => x + 1)), [controller])

  const themes = controller.themes
  const activeId = controller.activeId
  const presetThemes = themes.filter((t) => t.builtin)
  const customThemes = themes.filter((t) => !t.builtin)

  const saveCustom = (t: WebUITheme) => {
    if (!controller.saveCustom(t)) {
      window.alert('该 id 与内置预设冲突，请换一个 id。')
      return
    }
    setView({ kind: 'grid' })
  }

  const grid = createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
    createElement('div', { style: { fontSize: 14, fontWeight: 600 } },
      '主题风格 · 预设（' + presetThemes.length + '）'),
    createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 } },
      presetThemes.map((t) =>
        createElement(ThemeCard, {
          key: t.id, theme: t, active: t.id === activeId,
          onApply: (id) => controller.applyTheme(id),
          onEdit: () => {},
          onDelete: (id) => controller.deleteCustom(id),
        }),
      ),
    ),
    createElement('div', { style: { fontSize: 14, fontWeight: 600 } },
      '主题风格 · 我的主题（' + customThemes.length + '）'),
    customThemes.length > 0
      ? createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 } },
          customThemes.map((t) =>
            createElement(ThemeCard, {
              key: t.id, theme: t, active: t.id === activeId,
              onApply: (id) => controller.applyTheme(id),
              onEdit: (theme) => setView({ kind: 'edit', theme }),
              onDelete: (id) => controller.deleteCustom(id),
            }),
          ),
        )
      : createElement('div', { style: { ...cardS, padding: 12, fontSize: 12, color: tk.tertiary } },
          '还没有自定义主题。点击下方「＋ 新建主题」，创建你自己的主题风格。'),
  )

  const editor = view.kind === 'create'
    ? createElement(ThemeEditor, {
        onSave: saveCustom,
        onCancel: () => setView({ kind: 'grid' }),
      })
    : createElement(ThemeEditor, {
        initial: view.theme,
        onSave: saveCustom,
        onCancel: () => setView({ kind: 'grid' }),
      })

  return createElement('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 920 } },
    createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
      createElement('div', { style: { flex: 1 } },
        createElement('div', { style: { fontSize: 16, fontWeight: 600 } }, '主题商店'),
        createElement('div', { style: { fontSize: 12, color: tk.tertiary, marginTop: 2 } },
          '第一部分：全局界面调整（与主题无关，所有主题都生效）。第二部分：每个主题自己的风格。',
        ),
      ),
      createElement('button', {
        style: primaryBtn,
        onClick: () => setView({ kind: 'create' }),
      }, '＋ 新建主题'),
    ),

    /* ── 第一部分：全局界面调整（叠加在任意主题之上） ── */
    createElement(GlobalAdjuster, {
      tokens: controller.globalTokens,
      onChange: (next) => controller.setGlobal(next),
      onReset: () => controller.setGlobal({}),
    }),

    /* ── 第二部分：各主题自己的风格 ── */
    view.kind === 'grid' ? grid : editor,

    createElement('div', { style: { fontSize: 11, color: tk.tertiary } },
      '当前使用：' + (themes.find((t) => t.id === activeId)?.name ?? activeId ?? '—') +
      ' · 官方浅色/深色/跟随系统仍可在 设置 → 外观 切换，全局界面调整会继续生效。'),
  )
}
