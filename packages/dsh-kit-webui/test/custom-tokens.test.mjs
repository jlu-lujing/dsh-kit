import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isDefaultField, splitExtraTokens, isValidExtraKey, mergeExtraTokens,
} from '../src/client/custom-tokens.ts'
import { TOKEN_FIELDS } from '../src/client/themes.ts'

test('isDefaultField：固定字段是默认，其它不是', () => {
  for (const f of TOKEN_FIELDS) {
    assert.equal(isDefaultField(f.name), true, `${f.name} 应是默认字段`)
  }
  assert.equal(isDefaultField('--dsw-alias-foo'), false)
  assert.equal(isDefaultField('--dsw-specific-sidebar-fill'), true) // 也列在 TOKEN_FIELDS
})

test('splitExtraTokens：排除固定字段，保留额外 token', () => {
  const extras = splitExtraTokens({
    '--dsw-alias-bg-base': '#000',           // 默认字段 → 排除
    '--dsw-specific-sidebar-fill': '#111',   // 默认字段 → 排除
    '--dsw-alias-custom-accent': '#f00',     // 额外 → 保留
    '--dsw-custom-thing': '2px solid red',   // 额外（非 alias 前缀也保留）→ 保留
  })
  assert.deepEqual(extras, [
    { key: '--dsw-alias-custom-accent', value: '#f00' },
    { key: '--dsw-custom-thing', value: '2px solid red' },
  ])
})

test('isValidExtraKey：以 -- 开头且非默认字段', () => {
  assert.equal(isValidExtraKey('--dsw-alias-foo'), true)
  assert.equal(isValidExtraKey('--dsw-custom'), true)
  assert.equal(isValidExtraKey('dsw-alias-foo'), false)   // 不以 -- 开头
  assert.equal(isValidExtraKey('--dsw-alias-bg-base'), false) // 默认字段
  assert.equal(isValidExtraKey(''), false)
})

test('mergeExtraTokens：合入额外 token，忽略空值与非法 key，覆盖同名', () => {
  const base = { '--dsw-alias-bg-base': '#000' }
  const out = mergeExtraTokens(base, [
    { key: '--dsw-alias-custom-accent', value: '#f00' },
    { key: '--dsw-alias-custom-2', value: '' },        // 空 value → 忽略
    { key: 'no-prefix', value: '#0f0' },               // 非法 key → 忽略
    { key: '--dsw-alias-bg-base', value: '#123' },     // 默认字段被更新？→ 合入规则是“额外”也要经 isValid，默认字段会被忽略
  ])
  // 注意：mergeExtraTokens 的语义是“合入额外 token”，默认字段不在额外里，忽略。
  assert.deepEqual(out, {
    '--dsw-alias-bg-base': '#000',
    '--dsw-alias-custom-accent': '#f00',
  })
})

test('mergeExtraTokens：覆盖同 key 额外 token（base 与 extras 都有非默认 key）', () => {
  const base = { '--dsw-alias-existing': '#111' }
  const out = mergeExtraTokens(base, [
    { key: '--dsw-alias-existing', value: '#222' },
    { key: '--dsw-alias-new', value: '#333' },
  ])
  assert.deepEqual(out, {
    '--dsw-alias-existing': '#222',
    '--dsw-alias-new': '#333',
  })
})
