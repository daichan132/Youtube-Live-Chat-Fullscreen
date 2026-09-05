import { DEFAULT_GLOBAL_SETTINGS } from './defaults'
import { migrateSettings } from './migrateSettings'
import type { ChatSettings, GlobalSettings } from './model'
import { isRecord, normalizeChatSettings, normalizeGlobalSetting } from './normalizeSettings'
import { MAX_CUSTOM_PRESETS, SETTINGS_EXPORT_VERSION } from './persistConfig'

export type SettingsBackup = {
  version: typeof SETTINGS_EXPORT_VERSION
  exportedAt: string
  globalSetting: GlobalSettings
  chatSettings: ChatSettings
}

export type NormalizedSettingsBackup = {
  version: typeof SETTINGS_EXPORT_VERSION
  exportedAt?: string
  globalSetting: GlobalSettings
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

const normalizeBackupGlobal = (input: unknown, fallback: unknown): GlobalSettings => {
  const current = normalizeGlobalSetting(fallback)
  const next = normalizeGlobalSetting(input)
  return {
    ytdLiveChat: next.ytdLiveChat ?? current.ytdLiveChat ?? DEFAULT_GLOBAL_SETTINGS.ytdLiveChat,
    themeMode: next.themeMode ?? current.themeMode ?? DEFAULT_GLOBAL_SETTINGS.themeMode,
  }
}

export const buildSettingsBackup = (current: CurrentSettings, exportedAt = new Date().toISOString()): SettingsBackup => ({
  version: SETTINGS_EXPORT_VERSION,
  exportedAt,
  globalSetting: normalizeBackupGlobal(current.globalSetting, DEFAULT_GLOBAL_SETTINGS),
  chatSettings: normalizeChatSettings(current.chatSettings, current.chatSettings),
})

export const normalizeSettingsBackup = (input: unknown, current: CurrentSettings): NormalizedSettingsBackup | null => {
  if (!isRecord(input) || !isRecord(input.globalSetting)) return null

  const globalSetting = normalizeBackupGlobal(input.globalSetting, current.globalSetting)

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
