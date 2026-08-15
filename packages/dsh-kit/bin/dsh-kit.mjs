#!/usr/bin/env node
/** dsh-kit CLI: one-command family install + per-feature on/off without editing patches. */

import { spawnSync } from 'node:child_process'

import { createStore } from '../lib/state.js'
import { FEATURES } from '../lib/store.js'

const args = process.argv.slice(2)
const [cmd] = args

const defaults = Object.fromEntries(FEATURES.map(f => [f.id, f.defaultEnabled ?? true]))

if (cmd === undefined || cmd === 'list' || cmd === 'status' || cmd === 'ls') {
  const store = createStore(undefined, defaults)
  store.load()
  for (const f of FEATURES) {
    const enabled = store.isEnabled(f.id)
    console.log(`${enabled ? 'on ' : 'off'}  ${f.id.padEnd(22)} ${f.name} — ${f.description}`)
  }
  process.exit(0)
}

if (cmd === 'enable' || cmd === 'disable') {
  const id = args[1]
  if (id === undefined) {
    console.error(`dsh-kit: usage: dsh-kit ${cmd} <feature>`)
    process.exit(1)
  }
  if (!FEATURES.some(f => f.id === id)) {
    console.error(`dsh-kit: unknown feature "${id}". Known: ${FEATURES.map(f => f.id).join(', ')}`)
    process.exit(1)
  }
  const store = createStore(undefined, defaults)
  store.load()
  store.setEnabled(id, cmd === 'enable')
  console.log(`dsh-kit: ${id} ${cmd}d`)
  process.exit(0)
}

if (cmd === 'install') {
  // One command brings the whole family into a profile. dsh-kit is the only
  // install target: it declares the four feature packages as npm
  // dependencies, so `dsh plugin add dsh-kit` installs them (hoisted into the
  // profile root node_modules) and its own patch mounts all five rows.
  //   dsh-kit install [--profile <name>] [extra add flags...]
  const rest = args.slice(1)
  let profile = 'web'
  const passthrough = []
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a === '--profile') { profile = rest[++i]; continue }
    passthrough.push(a)
  }
  const dshArgs = ['plugin', '--profile', profile, 'add', '-w', ...passthrough, 'dsh-kit']
  console.log(`dsh-kit: installing family into profile "${profile}": dsh-kit + 4 feature deps`)
  const res = spawnSync('dsh', dshArgs, { stdio: 'inherit' })
  process.exit(res.status ?? 1)
}

console.error(`dsh-kit: unknown command "${cmd ?? ''}". Usage: dsh-kit [list|status|ls|install [--profile <name>]|enable <feature>|disable <feature>]`)
process.exit(1)
