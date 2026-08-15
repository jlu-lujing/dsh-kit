#!/usr/bin/env node
/**
 * Build the dsh-runtime directory + zip for the current platform.
 *
 * The runtime ships:
 *   - node_modules/@deepseek-ai/dsh   (the dsh CLI + its full dep tree)
 *   - node/bin/node                   (optional official Node binary)
 *   - runtime.json                    (schemaVersion/dshVersion/nodeVersion/…)
 *   - VERSION                         (plain-text dsh version)
 *
 * Source of truth for modules: the already-verified global install of
 * `@deepseek-ai/dsh` (`npm root -g`). We reuse its flattened dependency tree
 * (native prebuilds included) instead of re-installing, then trim what is
 * not needed for THIS platform.
 *
 * Usage:
 *   node scripts/build.mjs                # build zip with current-platform node
 *   node scripts/build.mjs --skip-node-download   # modules only (no node bin)
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const pkgRoot = fileURLToPath(new URL('..', import.meta.url))
const outDir = join(pkgRoot, 'out')          // <pkg>/out
const skipNodeDownload = process.argv.includes('--skip-node-download')

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */

function findGlobalDsh() {
  const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim()
  const pkgDir = join(root, '@deepseek-ai', 'dsh')
  const pkgJson = join(pkgDir, 'package.json')
  if (!existsSync(pkgJson)) {
    throw new Error(`no @deepseek-ai/dsh at ${pkgDir} (npm root -g = ${root})`)
  }
  const version = JSON.parse(readFileSync(pkgJson, 'utf8')).version
  return { root, pkgDir, version }
}

function hasZstd() {
  const r = spawnSync('zstd', ['--version'], { stdio: 'ignore' })
  return r.status === 0
}

function rmIfExists(p) {
  if (existsSync(p)) rmSync(p, { recursive: true, force: true })
}

function fmt(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/* ------------------------------------------------------------------ */
/* metadata                                                             */
/* ------------------------------------------------------------------ */

const dsh = findGlobalDsh()
const platform = process.platform
const arch = process.arch
const nodeVer = process.version.replace(/^v/, '')
const staging = join(tmpdir(), `dsh-runtime-build-${process.pid}-${Date.now()}`)
const destTree = join(staging, 'node_modules')
const nodeExe = platform === 'win32' ? 'node.exe' : 'node'

console.log(`[build] source dsh : ${dsh.pkgDir} (${dsh.version})`)
console.log(`[build] target    : ${platform}-${arch}, node ${nodeVer}`)

/* ------------------------------------------------------------------ */
/* Stage 1 — module tree                                               */
/* ------------------------------------------------------------------ */

console.log('[build] copying flat dependency tree (can take a while)…')
mkdirSync(join(destTree, '@deepseek-ai'), { recursive: true })

// The global install keeps a full flattened node_modules under
// @deepseek-ai/dsh/node_modules. Copy that as the runtime's top-level tree,
// then drop the nested copy (npm leaves it there; the layer above is what
// actually resolves every transitive dep at runtime — verified by smoke).
const srcTree = join(dsh.pkgDir, 'node_modules')
cpSync(srcTree, destTree, { recursive: true })

// place the dsh package itself at node_modules/@deepseek-ai/dsh
cpSync(dsh.pkgDir, join(destTree, '@deepseek-ai', 'dsh'), { recursive: true })

// drop the duplicate nested node_modules inside @deepseek-ai/dsh
rmIfExists(join(destTree, '@deepseek-ai', 'dsh', 'node_modules'))

/* ------------------------------------------------------------------ */
/* Stage 2 — node binary (optional)                                    */
/* ------------------------------------------------------------------ */

const nodeBinDir = join(staging, 'node', 'bin')
if (skipNodeDownload) {
  console.log('[build] --skip-node-download: skipping official Node binary fetch')
} else {
  mkdirSync(nodeBinDir, { recursive: true })
  console.log('[build] fetching official Node binary…')
  downloadNode(nodeVer, platform, arch, join(nodeBinDir, nodeExe))
}

/* ------------------------------------------------------------------ */
/* Stage 3 — trim cross-platform prebuilds + bloat                     */
/* ------------------------------------------------------------------ */

console.log('[build] trimming non-this-platform artifacts…')
trimPlatformDeps(destTree, platform, arch)
trimMaps(destTree)

/* ------------------------------------------------------------------ */
/* Stage 4 — metadata files                                            */
/* ------------------------------------------------------------------ */

const runtime = {
  schemaVersion: 1,
  dshVersion: dsh.version,
  nodeVersion: nodeVer,
  platform,
  arch,
  builtAt: new Date().toISOString(),
  bin: skipNodeDownload ? undefined : `node/bin/${nodeExe}`,
  launch: ['--expose-internals', 'node_modules/@deepseek-ai/dsh/lib/bin.js'],
}
writeFileSync(join(staging, 'runtime.json'), JSON.stringify(runtime, null, 2) + '\n')
writeFileSync(join(staging, 'VERSION'), `${dsh.version}\n`)

/* ------------------------------------------------------------------ */
/* Stage 5 — archive                                                   */
/* ------------------------------------------------------------------ */

mkdirSync(outDir, { recursive: true })
const base = `dsh-runtime-${dsh.version}-${platform}-${arch}`
const zipPath = join(outDir, `${base}.zip`)
const tmpZip = join(outDir, `.${base}.tmp-${process.pid}`)
rmIfExists(tmpZip)

const zstd = hasZstd()
if (zstd) console.log('[build] using zstd compression')
const tar = spawnSync('tar', [
  ...(zstd ? ['--use-compress-program=zstd -3 -T0'] : ['-z']),
  '--exclude=**/*.map',
  '--exclude=**/*.tsbuildinfo',
  '-cf', tmpZip, '-C', staging, '.',
], { stdio: 'inherit' })
if (tar.status !== 0) throw new Error(`tar failed: ${tar.status}`)

rmIfExists(zipPath)
cpSync(tmpZip, zipPath)
rmIfExists(tmpZip)
rmIfExists(staging)

console.log(`[build] done → ${zipPath} (${fmt(statSync(zipPath).size)})`)
console.log('[build] runtime.json:', JSON.stringify(runtime))

/* ------------------------------------------------------------------ */
/* implementations below                                                */
/* ------------------------------------------------------------------ */

function downloadNode(ver, platform, arch, dest) {
  // This skeleton deliberately does not auto-download the ~100MB Node
  // binary (requires a nodejs.org mirror or a pre-staged artifact in CI).
  // Local builds use --skip-node-download; the Electron-shell MVP also
  // works entirely from Electron's bundled Node via DshRuntime (DESKTOP §3.1).
  throw new Error(
    'official Node binary auto-download is not wired in this skeleton; ' +
    `run node scripts/build.mjs --skip-node-download and provide your own ` +
    `node/bin/${platform === 'win32' ? 'node.exe' : 'node'}, or implement ` +
    'downloadNode() in scripts/build.mjs'
  )
}

/** Keep only the current platform's native prebuild packages. */
function trimPlatformDeps(root, platform, arch) {
  // node-pty prebuilds (prebuilds/<platform>-<arch>/)
  const pty = join(root, 'node-pty', 'prebuilds')
  if (existsSync(pty)) {
    for (const d of readdirSync(pty)) {
      if (d !== `${platform}-${arch}`) rmIfExists(join(pty, d))
    }
  }
  // node-addon-require-builtin-<platform>-<arch> (optional deps)
  for (const d of readdirSync(root)) {
    if (d.startsWith('node-addon-require-builtin-') && d !== `node-addon-require-builtin-${platform}-${arch}`) {
      rmIfExists(join(root, d))
    }
  }
  // @img/sharp-* and @img/sharp-libvips-* platform packages
  const img = join(root, '@img')
  if (existsSync(img)) {
    for (const d of readdirSync(img)) {
      if (d.startsWith('sharp-') || d.startsWith('sharp-libvips-')) {
        const suffix = d.replace(/^sharp(-libvips)?-/, '')
        if (suffix !== `${platform}-${arch}`) rmIfExists(join(img, d))
      }
    }
  }
  // @koromix/koffi-<platform>-<arch> optional packages
  const koromix = join(root, '@koromix')
  if (existsSync(koromix)) {
    for (const d of readdirSync(koromix)) {
      if (d.startsWith('koffi-') && d !== `koffi-${platform}-${arch}`) rmIfExists(join(koromix, d))
    }
  }
}

/** Recurse and delete *.map / *.tsbuildinfo (debug only, not needed at runtime). */
function trimMaps(root) {
  const stack = [root]
  const drop = []
  while (stack.length) {
    const dir = stack.pop()
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { continue }
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) stack.push(full)
      else if (e.name.endsWith('.map') || e.name.endsWith('.tsbuildinfo')) drop.push(full)
    }
  }
  for (const f of drop) { try { rmIfExists(f) } catch { /* best-effort */ } }
}
