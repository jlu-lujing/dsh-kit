/** 主题卡片：色板预览 + 应用 / 编辑 / 删除。 */
import { createElement } from 'react'
import type { WebUITheme } from './themes.ts'
import { TOKEN_FIELDS } from './themes.ts'
import { tk, cardS, ghostBtn, primaryBtn } from './ui-style.ts'

export function ThemeCard(props: {
  theme: WebUITheme
  active: boolean
  onApply: (id: string) => void
  onEdit: (theme: WebUITheme) => void
  onDelete: (id: string) => void
}) {
  const { theme, active, onApply, onEdit, onDelete } = props
  const swatches = TOKEN_FIELDS.map((f) => ({ name: f.name, value: theme.tokens[f.name] }))
    .filter((s): s is { name: string; value: string } => typeof s.value === 'string')

  return createElement('div', {
    style: {
      ...cardS, padding: 12, display: 'flex', flexDirection: 'column', gap: 10,
      borderColor: active ? tk.accent : tk.border,
      boxShadow: active ? `0 0 0 1px ${tk.accent} inset` : undefined,
    },
  },
    createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
      createElement('div', { style: { flex: 1, minWidth: 0 } },
        createElement('div', { style: { fontSize: 14, fontWeight: 600 } }, theme.name),
        createElement('div', { style: { fontSize: 11, color: tk.tertiary, marginTop: 2 } },
          theme.description + ' · ' + (theme.colorScheme === 'dark' ? '深色底' : '浅色底')
          + (active ? ' · 使用中' : '')),
      ),
      theme.builtin
        ? createElement('span', { style: { fontSize: 10, color: tk.tertiary } }, '内置')
        : createElement('div', { style: { display: 'flex', gap: 4 } },
            createElement('button', {
              style: { ...ghostBtn, fontSize: 11, padding: '2px 8px' },
              onClick: () => onEdit(theme),
            }, '编辑'),
            createElement('button', {
              style: { ...ghostBtn, color: tk.danger, borderColor: tk.danger, fontSize: 11, padding: '2px 8px' },
              onClick: () => onDelete(theme.id),
            }, '删除'),
          ),
    ),
    createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18px, 1fr))', gap: 4 } },
      swatches.map((s) =>
        createElement('div', {
          key: s.name, title: `${s.name}: ${s.value}`,
          style: { height: 22, borderRadius: 4, background: s.value, border: '1px solid ' + tk.border },
        }),
      ),
    ),
    createElement('button', {
      style: active ? ghostBtn : primaryBtn,
      onClick: () => onApply(theme.id),
    }, active ? '使用中' : '应用这个主题'),
  )
}
