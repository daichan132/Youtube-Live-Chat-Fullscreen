import { utf8Bytes } from './customCss'
import type { ChatSettings } from './model'

export type SettingsCapacityErrorCode = 'settings-too-large'
export class SettingsCapacityError extends Error {
  constructor(readonly code: SettingsCapacityErrorCode) {
    super(code)
    this.name = 'SettingsCapacityError'
  }
}

// Applied CSS and its library each have an independent 256 KiB JSON budget.
// 384 KiB here plus those budgets leaves 128 KiB for wrapping/metadata/geometry.
export const getAppearanceCapacityError = (settings: Pick<ChatSettings, 'profile' | 'presets'>): SettingsCapacityErrorCode | null =>
  utf8Bytes(JSON.stringify(settings, null, 2)) > 384 * 1024 ? 'settings-too-large' : null

export const assertAppearanceCapacity = (settings: Pick<ChatSettings, 'profile' | 'presets'>) => {
  const error = getAppearanceCapacityError(settings)
  if (error) throw new SettingsCapacityError(error)
}
