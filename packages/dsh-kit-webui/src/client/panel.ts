/** 主题商店设置页面板：只保留预设主题选择（简洁，去掉自定义定制）。 */
import { createElement, useEffect, useState } from 'react'
import { tk } from './ui-style.ts'
import { ThemeCard } from './ui-card.ts'
import type { ThemeStoreController } from './controller.ts'

export function ThemeStorePanel({ controller }: { controller: ThemeStoreController }) {
  const [, force] = useState(0)

  useEffect(() => controller.subscribe(() => force((x) => x + 1)), [controller])

  const themes = controller.themes
  const activeId = controller.activeId
  // 只展示内置预设
  const presetThemes = themes.filter((t) => t.builtin)

  return createElement('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 860 } },
    createElement('div', { style: { fontSize: 16, fontWeight: 600 } }, '主题商店'),
    createElement('div', { style: { fontSize: 12, color: tk.tertiary } },
      '选择一套预设风格，后续会持续增加。',
    ),

    createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 } },
      presetThemes.map((t) =>
        createElement(ThemeCard, {
          key: t.id, theme: t, active: t.id === activeId,
          onApply: (id) => controller.applyTheme(id),
          onEdit: () => {},
          onDelete: () => {},
        }),
      ),
    ),

    createElement('div', { style: { fontSize: 11, color: tk.tertiary } },
      '当前使用：' + (themes.find((t) => t.id === activeId)?.name ?? activeId ?? '—') +
      ' · 官方浅色/深色/跟随系统仍可在 设置 → 外观 切换。'),
  )
}
