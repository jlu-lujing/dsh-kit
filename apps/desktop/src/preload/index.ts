/**
 * Preload：contextBridge 注入桌面信息（__DSH_DESKTOP__）与无边框窗口控制桥
 * （__dshDesktop.windowControl + __waitDshDesktop 就绪等待）。
 *
 * 上下文隔离开启，renderer 拿不到 Node；仅暴露只读元信息 + 窗口控制 IPC。
 */
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('__DSH_DESKTOP__', {
  version: process.env.DSH_DESKTOP_VERSION ?? '0.0.0',
  platform: process.platform,
  dshUrl: process.env.DSH_WEB_URL ?? '',
  runtimeVersion: process.env.DSH_RUNTIME_VERSION ?? '',
})

// 无边框窗口控制桥（供注入的桌面 chrome 脚本调用）
const dshDesktop = {
  windowControl: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  },
  onMaximizedChange: (cb: (isMax: boolean) => void) => {
    ipcRenderer.on('window:maximized-changed', (_e, isMax: boolean) => cb(Boolean(isMax)))
  },
}

contextBridge.exposeInMainWorld('__dshDesktop', dshDesktop)

// 就绪等待：注入脚本可能在 preload 桥接后执行，也可能早期执行；提供等待函数
contextBridge.exposeInMainWorld('__waitDshDesktop', (cb: (api: typeof dshDesktop) => void) => {
  cb(dshDesktop)
})
