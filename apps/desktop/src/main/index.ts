/**
 * dsh-kit Desktop — Electron 壳主进程。
 *
 * 流程（docs/DESKTOP.md §6）：
 *   应用启动 → 单实例锁 → 解析 dsh-runtime → 探测已有健康 dsh 实例（复用）
 *   → 否则 spawn 自己的 dsh（web --port 0）→ 等待 ready 行 → BrowserWindow.loadURL
 *   → 运行期仅放行同 origin → 退出时优雅停掉自管 dsh 子进程（external 实例不杀）。
 */

import { app, BrowserWindow, shell, dialog, Tray, ipcMain, screen } from 'electron'
import type { Rectangle } from 'electron'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { DESKTOP_CHROME_CSS, DESKTOP_CHROME_JS } from './desktop-chrome'
import {
  type DshProcess,
  buildSpawn,
  resolveRuntime,
  spawnWebAndWait,
  stopWeb,
} from './runtime'
import {
  applyUpdate,
  fetchFeed,
  type UpdateListener,
} from './updater'
import { applyAutostart, createTray, windowIconPath, appVersion } from './app-features'
import { ensureFamilyInstalled } from './plugins'

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  // 已有壳实例在运行：聚焦那个窗口后退出本实例。
  app.quit()
}

/** 本次壳管理的 dsh 子进程（external 时为 null → 退出不杀） */
let managed: DshProcess | null = null
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let dshUrl: string | null = null

/** 手动维护的最大化状态（transparent frameless 下 win.isMaximized() 不可靠） */
let manualMaximized = false
/** 最大化前的正常窗口 bounds（手动恢复用） */
let normalBounds: Rectangle | null = null
/** 手动拖动状态（记录起始窗口位置 + 起始光标位置） */
let dragState: { winX: number; winY: number; winW: number; winH: number; cursorX: number; cursorY: number } | null = null

function sendMaximizedState(win: BrowserWindow, isMax: boolean): void {
  manualMaximized = isMax
  if (!win.isDestroyed()) win.webContents.send('window:maximized-changed', isMax)
}

/** 用户数据目录（默认 ~/.dsh，与 CLI 共享 profile/插件/会话） */
function dshHome(): string {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

/** 应用日志目录，dsh 日志落盘便于排障 */
function logDir(): string {
  const dir = app.getPath('userData')
  try { mkdirSync(dir, { recursive: true }) } catch { /* 忽略 */ }
  return dir
}

function appendLog(line: string): void {
  try {
    writeFileSync(join(logDir(), 'desktop.log'), `${new Date().toISOString()} ${line}\n`, { flag: 'a' })
  } catch { /* 忽略 */ }
}

function createWindow(url: string): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    // 最小窗口尺寸：允许缩得更窄（360px），窄窗口下布局自动收窄/滚动
    minWidth: 360,
    minHeight: 620,
    show: false,
    // 无边框自绘窗口：frame:false 去掉系统标题栏/边框；
    // transparent + hasShadow 在 Windows 下让圆角外的区域透明（配合注入的
    // 根容器 border-radius），是社区通行的 frameless 圆角方案。
    frame: false,
    transparent: true,
    hasShadow: true,
    roundedCorners: true,
    title: `DeepSeek Harness App v${appVersion()}`,
    icon: windowIconPath(), // 非 darwin 平台窗口图标
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.once('ready-to-show', () => {
    normalBounds = mainWindow?.getBounds() ?? null
    mainWindow?.show()
  })
  void mainWindow.loadURL(url)

  // 窗口最大化状态变化 → 通知 renderer（切换按钮图标 / 取消圆角）
  mainWindow.on('maximize', () => { if (mainWindow) sendMaximizedState(mainWindow, true) })
  mainWindow.on('unmaximize', () => { if (mainWindow) sendMaximizedState(mainWindow, false) })

  // 导航仅放行同 origin；外部链接交给系统浏览器。
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (externalNav(targetUrl)) {
      void shell.openExternal(targetUrl)
    }
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (externalNav(targetUrl)) {
      event.preventDefault()
      void shell.openExternal(targetUrl)
    }
  })

  // 页面加载后注入无边框 chrome（圆角 / 拖拽 / 右上角窗口控制 / Session log 左移）
  mainWindow.webContents.on('did-finish-load', () => {
    injectDesktopChrome(mainWindow)
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

/** 向 dsh web UI 页面注入无边框窗口自绘 chrome（CSS + 控制按钮）。 */
function injectDesktopChrome(win: BrowserWindow | null): void {
  if (!win) return
  const wc = win.webContents
  // 单次注入：CSS 直接内联，避免两次 executeJavaScript 之间竞态
  // （第二次可能读到 __DSH_DESKTOP_CHROME_CSS__ 为 undefined → 样式缺失 → 控件错位）。
  const javaScript =
    'window.__DSH_DESKTOP_CHROME_CSS__ = ' + JSON.stringify(DESKTOP_CHROME_CSS) +
    '; if (!window.__dshKitDesktopChrome__) {' + DESKTOP_CHROME_JS + '}'
  wc.executeJavaScript(javaScript, true)
    .catch((err) => {
      console.warn('[desktop-chrome] inject failed:', err)
    })
}

/** 注册无边框窗口控制 IPC（min / toggleMaximize / close / isMaximized）。 */
function registerWindowControls(): void {
  ipcMain.handle('window:minimize', (e) => {
    BrowserWindow.fromWebContents(e.sender)?.minimize()
  })
  ipcMain.handle('window:toggle-maximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return false
    // Windows transparent frameless 窗口：win.isMaximized() 恒为 false、
    // win.unmaximize() 无效。改为手动保存/恢复 bounds（标准 workaround）。
    if (manualMaximized) {
      const target = normalBounds ?? { x: 100, y: 100, width: 1280, height: 820 }
      win.setBounds(target)
      sendMaximizedState(win, false)
      return false
    }
    normalBounds = win.getBounds()
    const display = screen.getDisplayMatching(normalBounds)
    win.setBounds(display.workArea)
    sendMaximizedState(win, true)
    return true
  })
  ipcMain.handle('window:close', (e) => {
    BrowserWindow.fromWebContents(e.sender)?.close()
  })
  ipcMain.handle('window:is-maximized', () => {
    return manualMaximized
  })

  // 手动拖动窗口（替代 -webkit-app-region: drag，避免吞掉 DOM 事件导致双击失效）
  ipcMain.on('window:drag-start', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win || manualMaximized) return
    const p = win.getPosition()
    const c = screen.getCursorScreenPoint()
    const b = win.getBounds()
    dragState = { winX: p[0], winY: p[1], winW: b.width, winH: b.height, cursorX: c.x, cursorY: c.y }
  })
  ipcMain.on('window:drag-move', (e, _dx, _dy) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win || !dragState) return
    const c = screen.getCursorScreenPoint()
    win.setBounds({ x: dragState.winX + (c.x - dragState.cursorX), y: dragState.winY + (c.y - dragState.cursorY), width: dragState.winW, height: dragState.winH })
  })
  ipcMain.on('window:drag-end', () => {
    dragState = null
  })
}

/** 只放行同 origin（当前 dsh loopback URL）；其余一律当作外部链接 */
function externalNav(targetUrl: string): boolean {
  if (!dshUrl) return true
  try {
    return new URL(targetUrl).origin !== new URL(dshUrl).origin
  } catch {
    return true
  }
}

function isAutoStartSuffix(): string {
  return process.env.DSH_DESKTOP_NO_AUTOSTART === '1' ? ' (autostart off)' : ''
}

/** 当存在托盘且非显式退出时，关闭窗口应驻留后台不退出。 */
function hasTrayStay(): boolean {
  return tray !== null && !(app as DeepSeekApp).isQuiting
}

/** 带自定义标志的 app 类型（isQuiting 由我们维护） */
interface DeepSeekApp {
  isQuiting?: boolean
}

/** 创建托盘（幂等），托盘菜单：显示窗口 / 检查更新 / 退出。 */
function ensureTray(): void {
  if (tray) return
  tray = createTray({
    onShow: () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      } else if (dshUrl) {
        createWindow(dshUrl)
      }
    },
    onCheckUpdate: () => { void checkForUpdates() },
    onQuit: () => {
      (app as DeepSeekApp).isQuiting = true
      app.quit()
    },
  })
}

async function boot(): Promise<void> {
  appendLog(`boot: starting, dshHome=${dshHome()}${isAutoStartSuffix()}`)

  // 0) 开机自启（默认开；环境变量可关） + 托盘
  try { applyAutostart(true) } catch { /* 忽略 */ }
  ensureTray()

  // 1) 定位 dsh-runtime
  const runtime = resolveRuntime(app.getPath('userData'))
  if (!runtime) {
    appendLog('boot: no dsh-runtime found')
    dialog.showErrorBox(
      'dsh-runtime 缺失',
      '未找到内置 dsh 运行时（node_modules/@deepseek-ai/dsh 不存在）。\n' +
      '请用 apps/dsh-runtime 构建 runtime 并放入 resources/dsh-runtime 或用户数据目录。',
    )
    app.quit()
    return
  }
  appendLog(`boot: runtime dir=${runtime.dir}, dsh=${runtime.meta.dshVersion ?? '?'}`)

  // 2) 探测已有健康 dsh 实例（默认 3080）——复用则不自己拉起
  const existingUrl = await probeExisting()
  if (existingUrl) {
    dshUrl = existingUrl
    createWindow(existingUrl)
    appendLog(`boot: reusing existing dsh at ${existingUrl}`)
    return
  }

  // 3) spawn 自己的 dsh
  try {
    const spawnBase = buildSpawn(runtime.dir, runtime.meta, dshHome())
    appendLog(`boot: spawning dsh web (node=${spawnBase.nodeBin})`)
    const { child, url, log } = await spawnWebAndWait(spawnBase, { timeoutMs: 30_000 })
    managed = { child, external: false, url }
    dshUrl = url
    appendLog(`boot: dsh ready at ${url}`)
    log.forEach((l) => appendLog(`dsh: ${l.trim()}`))

    // 自管实例就绪后，后台保证 web profile 里已装 dsh-kit 全家桶（开箱即用）。
    // 仅自管实例触发：复用外部 3080 时不干预用户已有实例。
    ensureFamilyInstalled(spawnBase.nodeBin, spawnBase.dshBin, {
      profile: 'web',
      dshHome: dshHome(),
      profilesDir: join(dshHome(), 'profiles'),
      log: (l) => appendLog(l),
    })

    createWindow(url)
    // 启动成功后后台非阻塞检查更新（失败只记录，不影响使用）
    checkForUpdates()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    appendLog(`boot: spawn failed: ${msg}`)
    // 打磨的错误页：加载 renderer 启动页并把错误写入 query
    showErrorPage(msg)
  }
}

/** 展示启动失败错误页（renderer），并保留进程供用户看日志/重试。 */
function showErrorPage(message: string): void {
  try {
    if (!mainWindow) {
      mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 360,
        minHeight: 620,
        show: false,
        // 与主窗口一致的无边框 + 圆角
        frame: false,
        transparent: true,
        hasShadow: true,
        roundedCorners: true,
        title: 'DeepSeek Harness App — 启动失败',
        icon: windowIconPath(),
        webPreferences: {
          preload: join(__dirname, '../preload/index.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      })
      mainWindow.once('ready-to-show', () => mainWindow?.show())
      mainWindow.on('closed', () => { mainWindow = null })
    }
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { error: message },
    })
  } catch (pageErr) {
    // 页面加载也失败时，退回系统错误框
    dialog.showErrorBox('dsh 启动失败', message)
  }
}

/** 更新 feed 的默认地址（发布时可覆盖；本地测试用 file:）。 */
function updateFeedUrl(): string {
  return (
    process.env.DSH_DESKTOP_FEED_URL ??
    'https://update.dsh-kit.dev/desktop/feed.json'
  )
}

/**
 * 后台检查更新：拉 feed → 有新版本则走完整更新链路（下载→校验→解压→冒烟→
 * 停旧→切换→重启→失败回滚）。用之内的 listener 记录日志/通知。
 */
async function checkForUpdates(): Promise<void> {
  const currentDir = resolveRuntime(app.getPath('userData'))?.dir
  // 只有自管 dsh 时才自动更新（external 复用不干预用户自己的实例）
  if (!managed || managed.external) return

  const listener: UpdateListener = (stage, detail) => {
    appendLog(`update: ${stage}${detail ? ` — ${detail}` : ''}`)
  }

  try {
    listener('检查更新', updateFeedUrl())
    const feed = await fetchFeed(updateFeedUrl())

    // 与当前运行时版本比较：相同/更低则跳过
    const nowMeta = managed ? resolveRuntime(app.getPath('userData'))?.meta : undefined
    if (nowMeta?.dshVersion && nowMeta.dshVersion === feed.dshVersion) {
      listener('已是最新', feed.dshVersion)
      return
    }

    listener('发现新版本', feed.dshVersion)
    const { managed: nextManaged, url } = await applyUpdate({
      userDataDir: app.getPath('userData'),
      feedUrl: updateFeedUrl(),
      dshHome: dshHome(),
      current: { dir: currentDir ?? '', child: managed?.child ?? null },
      desktopVersion: app.getVersion(),
      listener,
    })
    // 更新成功：替换壳状态并让窗口加载新 dsh URL
    managed = nextManaged
    dshUrl = url
    if (mainWindow) {
      void mainWindow.loadURL(url)
    } else {
      createWindow(url)
    }
    appendLog(`update: applied, now running dsh ${nextManaged.url}`)
  } catch (err) {
    listener('更新失败', err instanceof Error ? err.message : String(err))
  }
}

/**
 * 探测 127.0.0.1:<port> 是否已有健康 dsh 服务。
 * 默认端口 3080；可用环境变量 DSH_DESKTOP_PROBE_PORT 覆盖（测试/自定义端口）。
 */
async function probeExisting(): Promise<string | null> {
  const port = process.env.DSH_DESKTOP_PROBE_PORT ?? '3080'
  const url = `http://127.0.0.1:${port}`
  try {
    const res = await fetch(url)
    if (res.ok) return url
  } catch {
    // 无监听
  }
  return null
}

/** 退出：stopWeb 自管 dsh（external 不杀） */
function shutdown(): void {
  appendLog('shutdown: stopping managed dsh')
  if (managed && !managed.external) stopWeb(managed.child)
}

// 单实例：第二个实例触发此回调 → 聚焦已有窗口
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('window-all-closed', () => {
  // 有托盘时关闭窗口不退出（驻留后台）；真正退出走托盘菜单/系统退出。
  if (process.platform !== 'darwin' && !hasTrayStay()) app.quit()
})

app.on('activate', () => {
  if (mainWindow === null && dshUrl) createWindow(dshUrl)
})

app.on('before-quit', () => {
  (app as DeepSeekApp).isQuiting = true
  shutdown()
})

app.on('will-quit', () => {
  tray?.destroy()
  tray = null
})

if (gotLock) {
  registerWindowControls()
  void app.whenReady().then(boot)
}
