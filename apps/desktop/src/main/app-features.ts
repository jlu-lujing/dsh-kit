/**
 * AppFeatures — 桌面壳附加能力：托盘、开机自启、窗口图标。
 *
 * 设计：这些是壳自己的 UI/生命周期特性，与 dsh-runtime（spawn 抽象）解耦，
 * 全部只操作 Electron 的 app/BrowserWindow/Tray，不触及 dsh 契约。
 */

import { app, Menu, Tray, nativeImage, type NativeImage } from 'electron'
import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'

/** 已打包时 resource 里没有 build/（那是源码目录素材），所以用 dev/打包都取 app 可访问路径。 */
function trayIcon(): NativeImage {
  // 优先用打包资源里的图标（scripts/afterPack.cjs 已把 tray-*.png 拷进 Resources）；
  // 开发态回退到仓库 build/。
  const candidates = [
    join(process.resourcesPath ?? '', 'tray-16.png'),
    join(process.resourcesPath ?? '', 'tray-32.png'),
    join(__dirname, '..', '..', '..', 'build', 'tray-16.png'),
    join(__dirname, '..', '..', '..', 'build', 'tray-32.png'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      const img = nativeImage.createFromPath(p)
      if (!img.isEmpty()) return img
    }
  }
  // 最后兜底：空图
  return nativeImage.createEmpty()
}

export interface TrayCallbacks {
  onShow(): void
  onQuit(): void
  onCheckUpdate(): void
}

/** 创建托盘（菜单栏图标）。返回 Tray 实例或 null（平台不支持时）。 */
export function createTray(callbacks: TrayCallbacks): Tray | null {
  if (!Tray) return null
  const icon = trayIcon()
  // macOS：黑色爪印当 template 图标（系统自动适配深/浅色菜单栏）
  icon.setTemplateImage(process.platform === 'darwin')
  const tray = new Tray(icon)
  tray.setToolTip('dsh-kit Desktop')
  const menu = Menu.buildFromTemplate([
    { label: '显示窗口', click: () => callbacks.onShow() },
    { label: '检查更新', click: () => callbacks.onCheckUpdate() },
    { type: 'separator' },
    { label: '退出', click: () => callbacks.onQuit() },
  ])
  tray.setContextMenu(menu)
  tray.on('click', () => callbacks.onShow())
  return tray
}

/**
 * 开机自启：设置/查询登录时启动。
 * 用环境变量 DSH_DESKTOP_NO_AUTOSTART=1 可禁用（测试/开发）。
 */
export function applyAutostart(enable: boolean): void {
  if (process.env.DSH_DESKTOP_NO_AUTOSTART === '1') return
  try {
    app.setLoginItemSettings({
      openAtLogin: enable,
      // 仅 macOS 需要显式指定 args 保持单实例语义
      path: process.execPath,
      args: process.defaultApp === false ? [] : ['--user-data-dir=' + app.getPath('userData')],
    })
  } catch (err) {
    // 某些平台/环境不支持，静默失败不阻塞启动
    console.warn('[autostart] set failed:', err)
  }
}

export function isAutostartEnabled(): boolean {
  try {
    return app.getLoginItemSettings().openAtLogin
  } catch {
    return false
  }
}

/**
 * 窗口图标：macOS 在 dock 用应用图标；Windows/Linux 用 build/icon.png。
 * 返回 BrowserWindow options.icon（仅非 darwin 需要，darwin 由 app bundle 提供）。
 */
export function windowIconPath(): string | undefined {
  if (process.platform === 'darwin') return undefined
  const p = join(process.resourcesPath ?? '', 'icon.png')
  return existsSync(p) ? p : undefined
}

/** 读取应用版本（package.json version）。打包后 app.getVersion 优先，开发回退文件读。 */
export function appVersion(): string {
  try {
    return app.getVersion()
  } catch {
    /* fallthrough */
  }
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'))
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}
