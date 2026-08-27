import { BUILTIN_PRESETS } from '@/shared/settings/builtinPresets'
import type { PresetEntry } from '@/shared/settings/model'

/**
 * The name a user sees on a preset row. Built-in presets carry a translation key; custom ones carry
 * the name the user typed. Announcements and row labels must use this rather than the internal id.
 */
export const getPresetDisplayTitle = (preset: PresetEntry | undefined, t: (key: string) => string) =>
  preset?.kind === 'builtin' ? t(BUILTIN_PRESETS[preset.id].labelKey) : (preset?.name ?? '')
