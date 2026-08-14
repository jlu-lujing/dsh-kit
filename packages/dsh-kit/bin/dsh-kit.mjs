#!/usr/bin/env node
/** dsh-kit CLI: manage dsh-kit feature on/off state without editing patches. */

import { createStore } from '../lib/state.js'
import { FEATURES } from '../lib/store.js'

const [cmd, arg] = process.argv.slice(2)

if (cmd === undefined || cmd === 'list' || cmd === 'status' || cmd === 'ls') {
  const store = createStore()
  store.load()
  for (const f of FEATURES) {
    const enabled = store.isEnabled(f.id)
    console.log(`${enabled ? 'on ' : 'off'}  ${f.id.padEnd(22)} ${f.name} — ${f.description}`)
  }
  process.exit(0)
}

if (cmd === 'enable' || cmd === 'disable') {
  if (arg === undefined) {
    console.error(`dsh-kit: usage: dsh-kit ${cmd} <feature>`)
    process.exit(1)
  }
  const id = arg
  if (!FEATURES.some(f => f.id === id)) {
    console.error(`dsh-kit: unknown feature "${id}". Known: ${FEATURES.map(f => f.id).join(', ')}`)
    process.exit(1)
  }
  const store = createStore()
  store.load()
  store.setEnabled(id, cmd === 'enable')
  console.log(`dsh-kit: ${id} ${cmd}d`)
  process.exit(0)
}

console.error(`dsh-kit: unknown command "${cmd}". Usage: dsh-kit [list|status|ls|enable <feature>|disable <feature>]`)
process.exit(1)
