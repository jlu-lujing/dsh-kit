/** 自定义主题的「额外 token」编辑辅助。
 *
 * 预设/数据层本身支持任意 `--dsw-*`/`--dsw-alias-*` token（Record<string,string>），
 * 但 ui-editor 只渲染固定的 TOKEN_FIELDS。这里提供把额外 token 从主题拆出/合并的
 * 纯函数，让自定义主题可以编辑、新增固定字段之外的 token——不触碰内置默认字段。
 */

import { TOKEN_FIELDS } from './themes.ts'

/** 可自定义额外 token 的 key 前缀（与官方 alias token 风格一致）。 */
export const EXTRA_TOKEN_PREFIX = '--dsw-alias-'

/** 一行额外 token（key 需以 EXTRA_TOKEN_PREFIX 开头，value 非空）。 */
export interface ExtraToken { key: string; value: string }

/** 判断一个 token key 是否是「内置默认字段」（由 ui-editor 用 color 控件编辑）。 */
export function isDefaultField(name: string): boolean {
  return TOKEN_FIELDS.some((f) => f.name === name)
}

/** 从主题 tokens 里拆出额外 token（排除内置默认字段）。 */
export function splitExtraTokens(tokens: Record<string, string>): ExtraToken[] {
  const out: ExtraToken[] = []
  for (const [key, value] of Object.entries(tokens)) {
    if (isDefaultField(key)) continue
    out.push({ key, value })
  }
  return out
}

/** 校验一个额外 token key：非空、以 -- 开头、且非内置默认字段。 */
export function isValidExtraKey(key: string): boolean {
  return key.startsWith('--') && !isDefaultField(key)
}

/** 把一组额外 token 合入原 tokens。
 *
 * 只合入「合法额外 key（-- 开头且非默认字段）且 value 非空」的行；
 * 非法 key 与空 value 忽略（UI 上留空的行就是“要删除”的语义）。
 */
export function mergeExtraTokens(
  base: Record<string, string>,
  extras: ExtraToken[],
): Record<string, string> {
  const out = { ...base }
  for (const e of extras) {
    if (!isValidExtraKey(e.key) || e.value === '') continue
    out[e.key] = e.value
  }
  return out
}
