import { isCustomCssWithinLimit, utf8Bytes } from './customCss'
import type { ChatSettings } from './model'
import { MAX_SETTINGS_BACKUP_BYTES } from './persistConfig'

export type SettingsCapacityErrorCode = 'css-too-large' | 'settings-too-large'

export class SettingsCapacityError extends Error {
  constructor(readonly code: SettingsCapacityErrorCode) {
    super(code)
    this.name = 'SettingsCapacityError'
  }
}

export const getAppearanceCapacityError = (settings: Pick<ChatSettings, 'profile' | 'presets'>): SettingsCapacityErrorCode | null => {
  const profiles = [settings.profile, ...settings.presets.flatMap(preset => (preset.kind === 'custom' ? [preset.profile] : []))]
  if (profiles.some(profile => !isCustomCssWithinLimit(profile.cssCustomization.css))) return 'css-too-large'
  // Match the export's actual nesting, indentation and JSON escaping. Reserve
  // 4 KiB for bounded geometry/global settings, version and timestamp fields.
  // A preset list must remain exportable through the existing 1 MiB importer.
  const bytes = utf8Bytes(JSON.stringify({ chatSettings: { profile: settings.profile, presets: settings.presets } }, null, 2))
  return bytes > MAX_SETTINGS_BACKUP_BYTES - 4096 ? 'settings-too-large' : null
}

export const assertAppearanceCapacity = (settings: Pick<ChatSettings, 'profile' | 'presets'>) => {
  const error = getAppearanceCapacityError(settings)
  if (error) throw new SettingsCapacityError(error)
}
