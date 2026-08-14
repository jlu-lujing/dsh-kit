/** One-shot client bundle build (non-watch) — mirrors scripts/dev-web.ts but exits after one pass. */
import { globSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'tsdown'

const root = fileURLToPath(new URL('..', import.meta.url))
const pluginDirs = []
for (const m of globSync('packages/dsh-kit-*/package.json', { cwd: root }).sort()) {
  const p = JSON.parse(readFileSync(join(root, m), 'utf8'))
  if (p.dsh?.client?.platform === 'web') pluginDirs.push(dirname(m).split('/').join('/'))
}
console.log('client bundles for:', pluginDirs)
await build({ cwd: root, workspace: pluginDirs, watch: false })
console.log('done')
