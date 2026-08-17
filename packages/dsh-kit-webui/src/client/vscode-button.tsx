/**
 * 标题栏右侧「用 VS Code 打开当前项目」按钮。
 *
 * 注册进官方 conversation.session.header.actions（与 worktree 徽标同级），
 * 用 useSessions 取当前会话 cwd（官方当前 workspace 的目录），
 * 点击通过桌面桥 __dshDesktop.openInVscode 打开。
 */
import { createElement } from 'react'

interface Props {
  sessionId?: string | null
  useSessions?: (sel: (snapshot: unknown) => unknown) => unknown
  useRouter?: unknown
  useSession?: unknown
}

/** VS Code 官方 logo 的 SVG path（简化、单色 currentColor 描边）。 */
const VSCODE_PATH =
  'M3.09 2.46a.6.6 0 0 0-.39.55v14.51c0 .24.14.45.36.54l.04.02 6.75 2.38a.8.8 0 0 0 .57 0h.02l6.14-2.27c.38-.14.64-.5.64-.93V5.78c0-.42-.25-.79-.63-.93L10.17 2.6h-.03a.8.8 0 0 0-.54 0L3.1 2.46zm.8 3.03 2.08 4.95-2.08 1.05V5.49zm6.3 9.9-3.05 1.13L6.5 15.8l6.7-4.8-4.6 4.01.08.97 3.21 2.01-4.1-1.52 3.57 1.33 3.86-1.43-2.15 1.6-1.4-1.9h3.17l.6 1.38-4.29 1.6zm1.9-1.94 1.28.83-1.28.47v-1.3z'

/** 标题栏右侧小图标按钮样式（28px 圆，hover 灰底）。 */
const btnStyle: Record<string, string> = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  border: 'none',
  borderRadius: '50%',
  background: 'transparent',
  color: 'var(--dsw-alias-label-secondary)',
  cursor: 'pointer',
  flex: 'none',
  padding: 0,
  fontFamily: 'inherit',
}
const btnHoverStyle: Record<string, string> = {
  ...btnStyle,
  background: 'var(--dsw-alias-interactive-bg-hover)',
}

function VscodeIcon({ size = 15 }: { size?: number }): unknown {
  return createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true,
  }, createElement('path', { d: VSCODE_PATH, fill: 'currentColor' }))
}

export function VscodeOpenButton(props: Props): unknown {
  const sessionId = String(props.sessionId ?? '')
  const useSessions = props.useSessions as ((sel: (snapshot: unknown) => unknown) => unknown) | undefined

  const cwd = useSessions
    ? (useSessions((snapshot) => {
        const s = snapshot as { byId?: Record<string, { cwd?: string } | undefined> } | undefined
        return s?.byId?.[sessionId]?.cwd
      }) as string | undefined)
    : undefined

  if (cwd === undefined || cwd === '') return null

  const open = () => {
    const api = (window as unknown as { __dshDesktop?: { openInVscode?: (path: string) => Promise<unknown> } }).__dshDesktop
    if (api?.openInVscode) void api.openInVscode(cwd)
  }

  return createElement('button', {
    type: 'button',
    style: btnStyle,
    title: `用 VS Code 打开：${cwd}`,
    'aria-label': '用 VS Code 打开当前项目',
    onClick: open,
    onMouseEnter: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--dsw-alias-interactive-bg-hover)' },
    onMouseLeave: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'transparent' },
  }, createElement(VscodeIcon, {}))
}
