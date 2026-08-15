/** Feature catalog: every dsh-kit-* feature the aggregate exposes. */

export interface Feature {
  /** Cordis row id in the aggregate patch (also the feature package name). */
  id: string
  /** Human-readable name shown in the store panel. */
  name: string
  /** One-line description shown in the store panel. */
  description: string
  /** Default on/off when no explicit state is recorded (default true). */
  defaultEnabled?: boolean
  /** Whether the store offers an install/delete action for this feature. */
  installable?: boolean
  /**
   * Whether the store offers an enable/disable toggle button for this feature.
   * Defaults to true. Set to false for features whose on/off is driven purely
   * by an on-disk artifact (e.g. the anchored-standard preset installer), which
   * should only offer install/delete.
   */
  togglable?: boolean
}

export type FeatureId = Feature['id']

export const FEATURES: readonly Feature[] = [
  {
    id: 'dsh-kit-notifier',
    name: '桌面通知',
    description: '任务完成 / 需要关注时发送桌面通知',
  },
  {
    id: 'dsh-kit-scheduler',
    name: '定时任务',
    description: '按 cron 表达式周期执行任务',
  },
  {
    id: 'dsh-kit-lan-auth',
    name: '局域网鉴权网关',
    description: '自签名 HTTPS 网关：本机免登录，局域网 token/登录访问',
    defaultEnabled: false,
  },
  {
    id: 'dsh-anchored-standard',
    name: '锚定标准',
    description: '二阶段 Agent Preset：Minimal 引导（bash/str_replace_editor）→ 首次晋升后开放 Standard 工具；安装 preset 到 ~/.dsh/.agent-presets/anchored-standard',
    defaultEnabled: true,
    installable: true,
    togglable: false,
  },
]
