/** dsh-kit host plugin: aggregate shell + store state + feature toggling. */

import type { Context } from '@deepseek-ai/cordis'

import { createStore } from './state.ts'
import { FEATURES, type FeatureId } from './store.ts'

/** Cordis plugin name. */
export const name = 'dsh-kit'

export interface Config {
  /** Directory holding the dsh-kit state file. Defaults to dsh home. */
  stateDir?: string
}

/**
 * The dsh-kit service surface. The store panel and CLI consult it; feature
 * patch rows read the state file directly through their `disabled` expression
 * (self-contained, no service dependency), so the two stay consistent by
 * sharing the same state file path.
 */
export interface DshKitService {
  /** Every known feature with its current on/off state. */
  list(): Array<{ id: FeatureId; name: string; description: string; enabled: boolean }>
  /** Resolve whether a feature is currently enabled (missing entry = enabled). */
  featureState(id: FeatureId): boolean
  /** Persist a feature's on/off state. */
  setEnabled(id: FeatureId, enabled: boolean): void
}

export function apply(ctx: Context, config: Config = {}): void {
  const store = createStore(config.stateDir)
  store.load()

  const service: DshKitService = {
    list: () => FEATURES.map(f => ({
      ...f,
      enabled: store.isEnabled(f.id),
    })),
    featureState: id => store.isEnabled(id),
    setEnabled: (id, enabled) => {
      store.setEnabled(id, enabled)
    },
  }

  // Both names resolve through the loader's `!!js` `with (ctx)` scope.
  ctx.provide('dshKit.store')
  ctx.set('dshKit.store', service)
  ctx.provide('dshKit.featureState', service.featureState)
  ctx.set('dshKit.featureState', service.featureState)
}
