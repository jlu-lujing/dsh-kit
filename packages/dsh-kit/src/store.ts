/** Feature catalog: every dsh-kit-* feature the aggregate exposes. */

export interface Feature {
  /** Cordis row id in the aggregate patch (also the feature package name). */
  id: string
  /** Human-readable name shown in the store panel. */
  name: string
  /** One-line description shown in the store panel. */
  description: string
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
]
