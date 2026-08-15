/**
 * Preload：contextBridge 注入只读桌面信息（__DSH_DESKTOP__）。
 * 上下文隔离开启，renderer 拿不到 Node；仅暴露只读元信息 + 只写动作。
 *
 * 只暴露最小面：
 *   - version / platform / dshUrl / runtimeVersion（只读元信息）
 *   - 无 node / fs / child_process 能力（安全）
 */
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('__DSH_DESKTOP__', {
  version: process.env.DSH_DESKTOP_VERSION ?? '0.0.0',
  platform: process.platform,
  dshUrl: process.env.DSH_WEB_URL ?? '',
  runtimeVersion: process.env.DSH_RUNTIME_VERSION ?? '',
})
