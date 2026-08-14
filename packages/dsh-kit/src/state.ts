/** Persistent store of per-feature on/off state. */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

import type { FeatureId } from './store.ts'

interface StateFile {
  features: Partial<Record<FeatureId, boolean>>
}

export interface Store {
  load(): void
  isEnabled(id: FeatureId): boolean
  setEnabled(id: FeatureId, enabled: boolean): void
}

const DEFAULT_STATE: StateFile = { features: {} }

export function createStore(stateDir?: string): Store {
  const dir = stateDir ?? process.env.DSH_HOME ?? join(process.env.HOME ?? '.', '.dsh')
  const file = join(dir, 'dsh-kit', 'state.json')

  let state: StateFile = DEFAULT_STATE

  return {
    load() {
      try {
        state = JSON.parse(readFileSync(file, 'utf8')) as StateFile
      } catch {
        state = { ...DEFAULT_STATE }
      }
    },
    isEnabled(id) {
      return state.features[id] ?? true
    },
    setEnabled(id, enabled) {
      state.features[id] = enabled
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, JSON.stringify(state, null, 2))
    },
  }
}
