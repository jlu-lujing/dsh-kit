/**
 * FamilyPlugins — 桌面端「自动装 dsh-kit 全家桶」。
 *
 * 产品定位（README 双主线）：桌面客户端和 npm 插件包共享同一套 dsh-kit 全家桶
 * 逻辑。桌面端首次启动时应保证用户 web profile 里已装 dsh-kit 全家桶，做到
 * 「开箱即用」——否则用户打开看到的只有 DSH 本体，没有 dsh-kit 的五大功能。
 *
 * 实现：
 *   - 检测：读 <profile>/package.json 的 dependencies 是否含 dsh-kit；
 *   - 安装：spawn dsh 的 `plugin --profile <name> add -w dsh-kit`（与用户手动
 *     命令完全一致，dsh-kit 会带出其全部 feature 子包依赖 + 内置满血模式 preset）；
 *   - 该命令内部 forward 给系统 pnpm（dsh-runtime 不带 pnpm，需 PATH 里有 pnpm）；
 *   - 自动装是「尽力而为」：失败仅记录日志，不阻塞 dsh 启动、不弹错误框。
 */

import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { spawn } from 'node:child_process'

/** 起装全家桶的最小超时（秒）。pnpm 首次 install 可能较慢。 */
const INSTALL_TIMEOUT_MS = 120_000

export interface FamilyCheckOptions {
  /** 要装到的 profile 名（默认 web）。 */
  profile: string
  /** dshHome（~/.dsh 或 DSH_HOME），用于给子进程注入 DSH_HOME。 */
  dshHome?: string
  /** dshHome 下 profiles 目录的绝对路径，通常 <dshHome>/profiles。 */
  profilesDir: string
  /** 记录日志的回调（桌面端 appendLog）。 */
  log?: (line: string) => void
}

/** 读取某 profile 的 package.json 里的 dependencies（不存在视为空）。 */
function profileDeps(profilesDir: string, profile: string): Record<string, string> {
  try {
    const raw = readFileSync(`${profilesDir}/${profile}/package.json`, 'utf8')
    return (JSON.parse(raw) as { dependencies?: Record<string, string> }).dependencies ?? {}
  } catch {
    return {}
  }
}

/** 该 profile 是否已装 dsh-kit 全家桶（以 dependencies 里有 dsh-kit 为准）。 */
export function familyInstalled(opts: FamilyCheckOptions): boolean {
  return 'dsh-kit' in profileDeps(opts.profilesDir, opts.profile)
}

/**
 * spawn dsh 的 `plugin --profile <name> add -w dsh-kit` 把全家桶装进指定 profile。
 * PATH 里注入系统 pnpm 所在目录（dsh plugin 内部会 spawnSync("pnpm")）。
 *
 * @returns 安装成功与否。
 */
export async function installFamilyTo(
  nodeBin: string,
  dshBin: string,
  opts: FamilyCheckOptions,
): Promise<boolean> {
  const { profile, log } = opts
  const line = (s: string) => { try { log?.(s) } catch { /* 忽略 */ } }

  // 找系统 pnpm 的目录，注入 PATH（优先 PATH 里已有的，兜底用 which）
  let pnpmDir = ''
  try {
    const { execFileSync } = await import('node:child_process')
    const which = execFileSync('which', ['pnpm'], { encoding: 'utf8' }).trim()
    pnpmDir = which ? dirname(which) : ''
  } catch {
    pnpmDir = ''
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DSH_HOME: opts.dshHome ?? process.env.DSH_HOME ?? '',
    ELECTRON_RUN_AS_NODE: '1',
  }
  if (pnpmDir) {
    // 把 pnpm 目录放到 PATH 最前，确保 spawnSync("pnpm") 命中
    env.PATH = `${pnpmDir}:${env.PATH ? env.PATH : ''}`
  }

  const args = [dshBin, 'plugin', '--profile', profile, 'add', '-w', 'dsh-kit']
  line(`family: installing dsh-kit into profile "${profile}" via dsh plugin (node=${nodeBin})`)

  return await new Promise<boolean>((resolve) => {
    const child = spawn(nodeBin, args, { env, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL') } catch { /* 已退出 */ }
      line(`family: install timed out after ${INSTALL_TIMEOUT_MS}ms`)
      resolve(false)
    }, INSTALL_TIMEOUT_MS)

    const onData = (chunk: Buffer) => {
      const text = chunk.toString()
      out += text
      // 只记关键行，避免刷屏
      for (const ln of text.split('\n')) {
        const t = ln.trim()
        if (t && /(Progress|Done|added|removed|dir:|dsh-kit|error|Error|ERR_)/.test(t)) {
          line(`family: ${t}`)
        }
      }
    }
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)
    child.on('error', (err) => {
      clearTimeout(timer)
      line(`family: spawn error: ${err.message}`)
      resolve(false)
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      const ok = code === 0
      line(`family: install ${ok ? 'succeeded' : `failed (code=${code})`}`)
      // 失败时输出尾部日志便于排查
      if (!ok) {
        const tail = out.trim().split('\n').slice(-8).join(' | ')
        if (tail) line(`family: last output: ${tail}`)
      }
      resolve(ok)
    })
  })
}

/** 便捷入口：未装则发起安装（内部会 spawn），返回是否已就绪（装好或已存在）。 */
export function ensureFamilyInstalled(nodeBin: string, dshBin: string, opts: FamilyCheckOptions): void {
  if (process.env.DSH_DESKTOP_SKIP_FAMILY === '1') {
    opts.log?.(`family: skipped by DSH_DESKTOP_SKIP_FAMILY=1`)
    return
  }
  if (familyInstalled(opts)) {
    opts.log?.(`family: dsh-kit already installed in profile "${opts.profile}"`)
    return
  }
  // 后台安装，不阻塞 boot
  void installFamilyTo(nodeBin, dshBin, opts).then((ok) => {
    opts.log?.(`family: ${ok ? 'ready' : 'failed — user can install manually via dsh plugin --profile ${opts.profile} add -w dsh-kit'}`)
  })
}
