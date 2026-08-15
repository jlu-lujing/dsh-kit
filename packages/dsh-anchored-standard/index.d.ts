/** Type declarations for the dsh-anchored-standard file-system installer. */

export const name: 'dsh-anchored-standard'
export const inject: never[]
export const PRESET_ID: 'anchored-standard'
export const PACKAGE_SPEC: 'dsh-anchored-standard'

export interface InstallResult {
  target: string
  installed: boolean
  skipped?: 'already-installed' | 'existing-target'
}

export interface UninstallResult {
  target: string
  removed: boolean
}

export interface InstallOptions {
  home?: string
  sourceDir?: string
  targetDir?: string
}

export function resolveDshHome(home?: string): string
export function presetTargetDir(home?: string): string
export function presetSourceDir(): string
export function isInstalled(options?: InstallOptions): boolean
export function installPreset(options?: InstallOptions): InstallResult
export function uninstallPreset(options?: InstallOptions): UninstallResult
export function apply(ctx?: unknown, config?: { enabled?: boolean; home?: string }): void
