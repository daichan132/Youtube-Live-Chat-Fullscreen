import { migrateSettings } from './migrateSettings'
import type { ChatSettings } from './model'
import { isRecord, normalizeChatSettings, normalizeGlobalSetting } from './normalizeSettings'
import { MAX_CUSTOM_PRESETS, SETTINGS_EXPORT_VERSION } from './persistConfig'

export type SettingsBackup = {
  version: typeof SETTINGS_EXPORT_VERSION
  exportedAt: string
  globalSetting: Record<string, unknown>
  chatSettings: ChatSettings
}

export type NormalizedSettingsBackup = {
  version: typeof SETTINGS_EXPORT_VERSION
  exportedAt?: string
  globalSetting: Record<string, unknown>
  chatSettings: ChatSettings
}

const hasTooManyCustomPresets = (input: unknown) =>
  isRecord(input) &&
  Array.isArray(input.presets) &&
  input.presets.filter(preset => isRecord(preset) && preset.kind === 'custom').length > MAX_CUSTOM_PRESETS

type CurrentSettings = {
  globalSetting: Record<string, unknown>
  chatSettings: ChatSettings
}

export const buildSettingsBackup = (current: CurrentSettings, exportedAt = new Date().toISOString()): SettingsBackup => ({
  version: SETTINGS_EXPORT_VERSION,
  exportedAt,
  globalSetting: normalizeGlobalSetting(current.globalSetting),
  chatSettings: normalizeChatSettings(current.chatSettings, current.chatSettings),
})

export const normalizeSettingsBackup = (input: unknown, current: CurrentSettings): NormalizedSettingsBackup | null => {
  if (!isRecord(input) || !isRecord(input.globalSetting)) return null

  const globalSetting = {
    ...current.globalSetting,
    ...normalizeGlobalSetting({
      ...current.globalSetting,
      ...input.globalSetting,
    }),
  }

  if (input.version === SETTINGS_EXPORT_VERSION) {
    if (!isRecord(input.chatSettings) || hasTooManyCustomPresets(input.chatSettings)) return null
    return {
      version: SETTINGS_EXPORT_VERSION,
      exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : undefined,
      globalSetting,
      chatSettings: normalizeChatSettings(
        {
          ...current.chatSettings,
          ...input.chatSettings,
        },
        current.chatSettings,
      ),
    }
  }

  if (input.version === 1) {
    if (!isRecord(input.ytdLiveChat)) return null
    const chatSettings = migrateSettings(input.ytdLiveChat)
    if (hasTooManyCustomPresets(chatSettings)) return null
    return {
      version: SETTINGS_EXPORT_VERSION,
      exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : undefined,
      globalSetting,
      chatSettings,
    }
  }

  return null
}
