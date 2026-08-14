/**
 * Watch-build for dsh-kit client-plugin HMR.
 *
 * Runs every package under packages/ that declares `dsh.client` (platform
 * "web") through the tsdown JS API in watch mode. The host webserver's
 * `client-hmr` plugin stat-polls the bundles it serves and broadcasts
 * `rebuilt` frames itself, so any process rewriting `lib/client.js` triggers
 * browser reloads — this script is just the convenient way to keep them all
 * rebuilt on source change.
 *
 * Usage: `pnpm dev [--poll[=ms]]`. Mirrors the official dev-web.ts; this
 * variant scans only `packages/dsh-kit-*/` instead of a whole monorepo.
 */
import { globSync, readFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'tsdown'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

/** Every packages/dsh-kit-*/package.json carrying dsh.client.platform "web". */
export function discoverPluginDirs(root = repoRoot): string[] {
  const dirs: string[] = []
  for (const manifestPath of globSync('packages/dsh-kit-*/package.json', { cwd: root }).sort()) {
    const manifest = JSON.parse(readFileSync(join(root, manifestPath), 'utf8')) as {
      dsh?: { client?: { platform?: unknown } }
    }
    if (manifest.dsh?.client?.platform === 'web') dirs.push(dirname(manifestPath).split(sep).join('/'))
  }
  return dirs
}

/** Start the tsdown watch build used by `pnpm dev`. */
export async function watchClientPlugins(
  root: string,
  pluginDirs: readonly string[],
  pollInterval?: number,
): Promise<void> {
  const bundles = await build({
    cwd: root,
    workspace: [...pluginDirs],
    watch: true,
    ...pollInterval !== undefined
      ? { inputOptions: { watch: { watcher: { usePolling: true, pollInterval } } } }
      : {},
  })
  return void bundles
}

const invokedPath = process.argv[1]
const isMain = invokedPath !== undefined && import.meta.url === pathToFileURL(resolve(invokedPath)).href
if (isMain) {
  const pluginDirs = discoverPluginDirs()
  if (pluginDirs.length === 0) {
    console.error('dev: no dsh.client (platform "web") packages found under packages/')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const pollArg = args.find(a => a === '--poll' || a.startsWith('--poll='))
  if (args.some(a => a !== pollArg)) {
    console.error('dev: usage: tsx scripts/dev-web.ts [--poll[=ms]]')
    process.exit(1)
  }
  const pollInterval = pollArg === undefined ? undefined : Number(pollArg.split('=')[1] ?? '500')
  if (pollInterval !== undefined && (!Number.isInteger(pollInterval) || pollInterval <= 0)) {
    console.error(`dev: invalid --poll interval "${pollArg ?? ''}"`)
    process.exit(1)
  }

  await watchClientPlugins(repoRoot, pluginDirs, pollInterval)
  console.log(
    `dev: watching ${String(pluginDirs.length)} dsh.client plugin packages`
    + `${pollInterval !== undefined ? ` (polling ${String(pollInterval)}ms)` : ''}:\n  ${pluginDirs.join('\n  ')}`,
  )
}
