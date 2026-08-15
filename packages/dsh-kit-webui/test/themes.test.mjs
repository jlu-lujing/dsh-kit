import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BUILTIN_THEMES, TOKEN_FIELDS, loadStored, saveStored, setTokenMode,
} from '../src/client/themes.ts'

function mockStorage() {
  const mem = new Map()
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  }
  return mem
}

test('内置预设：3 个家族 x 深/浅两版 = 6 个，token 为单值且字段完整', () => {
  assert.equal(BUILTIN_THEMES.length, 6)
  const families = new Set(BUILTIN_THEMES.map((t) => t.id.replace(/-(dark|light)$/, '')))
  assert.deepEqual([...families].sort(), ['forest', 'ocean', 'sakura'])
  for (const family of families) {
    assert.ok(BUILTIN_THEMES.some((t) => t.id === `${family}-dark` && t.colorScheme === 'dark'))
    assert.ok(BUILTIN_THEMES.some((t) => t.id === `${family}-light` && t.colorScheme === 'light'))
  }
  for (const t of BUILTIN_THEMES) {
    for (const f of TOKEN_FIELDS) {
      assert.equal(typeof t.tokens[f.name], 'string', `${t.id} 缺 ${f.name}`)
    }
    assert.ok(Object.values(t.tokens).every((v) => typeof v === 'string'))
  }
})

test('localStorage 持久化：自定义主题 + active + 全局层往返', () => {
  const mem = mockStorage()
  saveStored({
    custom: [{ id: 'mine-dark', name: 'Mine', description: 'd', colorScheme: 'dark', builtin: false, tokens: { '--dsw-alias-bg-base': '#111' } }],
    active: 'ocean-dark',
    global: { '--dsw-alias-brand-primary': { light: '#123456', dark: '#abcdef' } },
  })
  assert.equal(mem.size, 1)
  const back = loadStored()
  assert.equal(back.custom.length, 1)
  assert.equal(back.custom[0].id, 'mine-dark')
  assert.equal(back.active, 'ocean-dark')
  assert.deepEqual(back.global['--dsw-alias-brand-primary'], { light: '#123456', dark: '#abcdef' })
})

test('localStorage 损坏/空数据回退为安全默认', () => {
  const mem = mockStorage()
  mem.set('dsh-kit-webui.themes.v1', '{broken json')
  assert.deepEqual(loadStored(), { custom: [], active: null, global: {} })
  mem.set('dsh-kit-webui.themes.v1', JSON.stringify({ custom: [null], active: 3, global: { x: 'bad' } }))
  assert.deepEqual(loadStored(), { custom: [], active: null, global: {} })
})

test('setTokenMode：另一模式为空时回填同值，已有值保持不变', () => {
  const a = setTokenMode({}, '--dsw-alias-brand-primary', 'light', '#123456')
  assert.deepEqual(a['--dsw-alias-brand-primary'], { light: '#123456', dark: '#123456' })
  const b = setTokenMode(a, '--dsw-alias-brand-primary', 'dark', '#abcdef')
  assert.deepEqual(b['--dsw-alias-brand-primary'], { light: '#123456', dark: '#abcdef' })
})
