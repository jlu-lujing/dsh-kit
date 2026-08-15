import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { apply, installPreset, isInstalled, PRESET_ID, presetTargetDir, resolveDshHome, uninstallPreset } from '../index.mjs'

function tempHome() {
  return mkdtempSync(join(tmpdir(), 'dsh-anchored-standard-test-'))
}

test('installs the complete preset into a fresh DSH home', (t) => {
  const home = tempHome()
  t.after(() => rmSync(home, { recursive: true, force: true }))

  const result = installPreset({ home })

  assert.equal(result.installed, true)
  assert.equal(result.target, presetTargetDir(home))
  assert.equal(result.target, join(resolveDshHome(home), '.agent-presets', PRESET_ID))
  assert.ok(existsSync(join(result.target, 'agent.cordis.yml')))
  assert.ok(existsSync(join(result.target, 'preset.yml')))
  assert.ok(existsSync(join(result.target, 'tool-bootstrap.mjs')))
  assert.match(readFileSync(join(result.target, 'preset.yml'), 'utf8'), /name: 锚定标准/)
})

test('second install is idempotent and preserves an existing target verbatim', (t) => {
  const home = tempHome()
  t.after(() => rmSync(home, { recursive: true, force: true }))

  assert.equal(installPreset({ home }).installed, true)
  const target = presetTargetDir(home)
  const marker = join(target, 'USER_NOTE.txt')
  writeFileSync(marker, 'keep me')

  const second = installPreset({ home })

  assert.equal(second.installed, false)
  assert.equal(second.skipped, 'already-installed')
  assert.equal(readFileSync(marker, 'utf8'), 'keep me')
})

test('an existing incomplete target is never clobbered', (t) => {
  const home = tempHome()
  t.after(() => rmSync(home, { recursive: true, force: true }))

  const target = presetTargetDir(home)
  mkdirSync(target, { recursive: true })
  writeFileSync(join(target, 'preset.yml'), 'user-authored partial')

  const result = installPreset({ home })

  assert.equal(result.installed, false)
  assert.equal(result.skipped, 'existing-target')
  assert.equal(readFileSync(join(target, 'preset.yml'), 'utf8'), 'user-authored partial')
  assert.equal(existsSync(join(target, 'agent.cordis.yml')), false)
})

test('uninstall removes an installed preset and is a no-op when absent', (t) => {
  const home = tempHome()
  t.after(() => rmSync(home, { recursive: true, force: true }))

  assert.equal(installPreset({ home }).installed, true)
  assert.equal(isInstalled({ home }), true)
  assert.equal(uninstallPreset({ home }).removed, true)
  assert.equal(isInstalled({ home }), false)
  assert.equal(uninstallPreset({ home }).removed, false)
})

test('apply installs by default and can be disabled via config', (t) => {
  const home = tempHome()
  t.after(() => rmSync(home, { recursive: true, force: true }))
  const calls = []
  const ctx = { logger: { info: (m) => calls.push(m), warn: (m) => calls.push(m) } }

  apply(ctx, { home })
  assert.ok(existsSync(join(presetTargetDir(home), 'agent.cordis.yml')))

  const otherHome = tempHome()
  t.after(() => rmSync(otherHome, { recursive: true, force: true }))
  apply(ctx, { home: otherHome, enabled: false })
  assert.equal(existsSync(presetTargetDir(otherHome)), false)
})
