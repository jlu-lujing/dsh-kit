/**
 * dsh-anchored-standard host plugin (file-system installer).
 *
 * This feature is an AGENT PRESET, not a Cordis service: it ships the
 * community preset files under `preset/` and, when its row is enabled,
 * installs them idempotently into the DSH user preset root:
 *
 *   ${DSH_HOME:-~/.dsh}/.agent-presets/anchored-standard/
 *
 * The install destination and preset id match the upstream project exactly:
 * one directory per preset under `~/.dsh/.agent-presets/<id>/`, so DSH's
 * agent-preset roster discovers it without any profile edits.
 *
 * It is ON by default (part of the dsh-kit family). An existing target
 * directory is never overwritten (user edits are preserved); a fresh install
 * first copies into a hidden staging directory and then renames it into
 * place, so a crash cannot leave a half-written preset behind.
 */

import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Package name / feature id. */
export const pkgName = 'dsh-anchored-standard'
/** npm spec to install the upstream package when only a feature id is known. */
export const PACKAGE_SPEC = pkgName

/** Cordis plugin name (the loader entry id used by dsh-kit's aggregate patch). */
export const name = 'dsh-anchored-standard'

/** No services are required: installation is pure file I/O. */
export const inject = []

/** Preset id under the user preset root, matching the shipped directory name. */
export const PRESET_ID = 'anchored-standard'

/** Files that make a directory a complete DSH agent preset. */
const REQUIRED_FILES = ['agent.cordis.yml', 'preset.yml']

/** Resolve the DSH home directory (config root, NOT the `.agent-presets` dir). */
export function resolveDshHome(home) {
  return home ?? process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

/** Absolute path of the preset directory managed by this installer. */
export function presetTargetDir(home) {
  return join(resolveDshHome(home), '.agent-presets', PRESET_ID)
}

/** Absolute path of the bundled preset source shipped inside this package. */
export function presetSourceDir() {
  return fileURLToPath(new URL('./preset/', import.meta.url))
}

function isCompletePreset(dir) {
  return REQUIRED_FILES.every((file) => existsSync(join(dir, file)))
}

/** Whether the preset directory is currently installed at the default home. */
export function isInstalled(options = {}) {
  return existsSync(presetTargetDir(options.home))
}

/** Remove the installed preset directory (no-op when absent). */
export function uninstallPreset(options = {}) {
  const target = options.targetDir ?? presetTargetDir(options.home)
  if (!existsSync(target)) return { removed: false, target }
  rmSync(target, { recursive: true, force: true })
  return { removed: true, target }
}

/**
 * Materialize the bundled `anchored-standard` preset once.
 *
 * Idempotent and non-destructive: when the target already exists it is left
 * verbatim (user edits are preserved). A fresh install copies into a hidden
 * staging directory first and renames it into place, so the public preset
 * path only ever appears complete.
 */
export function installPreset(options = {}) {
  const source = options.sourceDir ?? presetSourceDir()
  const target = options.targetDir ?? presetTargetDir(options.home)
  const parent = dirname(target)

  mkdirSync(parent, { recursive: true })

  if (existsSync(target)) {
    return {
      target,
      installed: false,
      skipped: isCompletePreset(target) ? 'already-installed' : 'existing-target',
    }
  }

  const staging = join(parent, `.${PRESET_ID}.dsh-kit-install`)
  rmSync(staging, { recursive: true, force: true })
  try {
    cpSync(source, staging, { recursive: true, dereference: true })
    if (!isCompletePreset(staging)) {
      throw new Error(`${name}: bundled preset source is incomplete: ${source}`)
    }
    renameSync(staging, target)
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw error
  }

  return { target, installed: true }
}

/** Cordis apply: install the preset when this feature row is enabled. */
export function apply(ctx = {}, config = {}) {
  if (config.enabled === false) return

  let result
  try {
    result = installPreset({ home: config.home })
  } catch (error) {
    // Installation must not take down the host boot: the feature row simply
    // stays enabled and the preset remains absent until the next restart.
    ctx?.logger?.warn?.(`${name}: preset installation failed: ${String(error?.message ?? error)}`)
    return
  }

  if (result.installed) {
    ctx?.logger?.info?.(`${name}: installed preset at ${result.target}`)
  } else if (result.skipped === 'existing-target') {
    ctx?.logger?.warn?.(`${name}: ${result.target} exists but is not a complete preset; leaving it untouched`)
  }
}
