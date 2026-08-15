/**
 * dsh-kit Desktop — Electron 壳主进程。
 *
 * 流程（docs/DESKTOP.md §6）：
 *   应用启动 → 单实例锁 → 解析 dsh-runtime → 探测已有健康 dsh 实例（复用）
 *   → 否则 spawn 自己的 dsh（web --port 0）→ 等待 ready 行 → BrowserWindow.loadURL
 *   → 运行期仅放行同 origin → 退出时优雅停掉自管 dsh 子进程（external 实例不杀）。
 */

import { app, BrowserWindow, shell, dialog } from 'electron'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
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

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  // 已有壳实例在运行：聚焦那个窗口后退出本实例。
  app.quit()
}

/** 本次壳管理的 dsh 子进程（external 时为 null → 退出不杀） */
let managed: DshProcess | null = null
let mainWindow: BrowserWindow | null = null
let dshUrl: string | null = null

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
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.loadURL(url)

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

  mainWindow.on('closed', () => { mainWindow = null })
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

async function boot(): Promise<void> {
  appendLog(`boot: starting, dshHome=${dshHome()}`)

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
    createWindow(url)
    // 启动成功后后台非阻塞检查更新（失败只记录，不影响使用）
    checkForUpdates()
  } catch (err) {
    appendLog(`boot: spawn failed: ${err instanceof Error ? err.message : String(err)}`)
    dialog.showErrorBox('dsh 启动失败', String(err))
    app.quit()
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
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null && dshUrl) createWindow(dshUrl)
})

app.on('before-quit', shutdown)

if (gotLock) {
  void app.whenReady().then(boot)
}
