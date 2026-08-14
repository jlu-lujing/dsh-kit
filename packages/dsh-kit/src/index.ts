/** dsh-kit host plugin: aggregate shell + store state + feature toggling. */

import type { Context } from '@deepseek-ai/cordis'

import { createStore } from './state.ts'
import { FEATURES, type FeatureId } from './store.ts'

/** Cordis plugin name. */
export const name = 'dsh-kit'

/** Required services: the timer service provides scheduling for the store. */
export const inject = ['timer']

export interface Config {
  /** Directory holding the dsh-kit state file. Defaults to dsh home. */
  stateDir?: string
}

export function apply(ctx: Context, config: Config = {}): void {
  const store = createStore(config.stateDir)
  store.load()

  ctx.provide('dshKit.store')
  ctx.set('dshKit.store', {
    list: () => FEATURES.map(f => ({
      ...f,
      enabled: store.isEnabled(f.id),
    })),
    setEnabled: (id: FeatureId, enabled: boolean) => {
      store.setEnabled(id, enabled)
    },
  })
}
