import { atom } from 'jotai'
import { disableProfileCustomCss } from '@/shared/settings/customCss'
import type { ChatSettings } from '@/shared/settings/model'
import { getAppearanceCapacityError, type SettingsCapacityErrorCode } from '@/shared/settings/settingsCapacity'
import { effectiveProfileAtom } from './atoms'

// Fail closed until the independent storage domain has been read. This atom
// is never included in profiles, presets, history or settings backups.
export const customCssSuspendedAtom = atom(true)

// Mask only runtime input. Saving a preset while suspended must preserve the
// user's original CSS and enabled preference, not save the temporary mask.
export const runtimeProfileAtom = atom(get => {
  const profile = get(effectiveProfileAtom)
  return get(customCssSuspendedAtom) ? disableProfileCustomCss(profile) : profile
})

export const appearanceCapacityErrorAtom = atom<SettingsCapacityErrorCode | null>(null)

export const validateAppearanceCapacityAtom = atom(null, (_get, set, next: Pick<ChatSettings, 'profile' | 'presets'>) => {
  const error = getAppearanceCapacityError(next)
  set(appearanceCapacityErrorAtom, error)
  return error === null
})
