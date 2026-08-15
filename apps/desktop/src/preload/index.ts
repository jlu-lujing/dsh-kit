/**
 * Preload：contextBridge 注入只读桌面信息（__DSH_DESKTOP__）。
 * 上下文隔离开启，renderer 拿不到 Node；仅暴露 dsh 的 loopback URL 供状态栏展示。
 */
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('__DSH_DESKTOP__', {
  version: process.env.DSH_DESKTOP_VERSION ?? '0.0.0',
  dshUrl: process.env.DSH_WEB_URL ?? '',
})
