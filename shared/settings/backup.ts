import { DEFAULT_GLOBAL_SETTINGS } from './defaults'
import {
  assertCustomCss, assertSavedChatCss, type ChatCssCustomization, DEFAULT_CUSTOM_CSS, readCustomCssBackup,
  type SavedChatCss, utf8Bytes,
} from './customCss'
import { migrateSettings } from './migrateSettings'
import type { ChatSettings, GlobalSettings } from './model'
import { isRecord, normalizeChatSettings, normalizeGlobalSetting } from './normalizeSettings'
import { MAX_CUSTOM_PRESETS, MAX_SETTINGS_BACKUP_BYTES, SETTINGS_EXPORT_VERSION } from './persistConfig'
import { assertAppearanceCapacity } from './settingsCapacity'

export type SettingsBackup = {
  version: typeof SETTINGS_EXPORT_VERSION
  exportedAt: string
  globalSetting: GlobalSettings
  chatSettings: ChatSettings
  customCss: ChatCssCustomization
  savedChatCss: SavedChatCss[]
}
export type NormalizedSettingsBackup = Omit<SettingsBackup, 'exportedAt'> & { exportedAt?: string }

type CurrentSettings = {
  globalSetting: Record<string, unknown>
  chatSettings: ChatSettings
  customCss?: ChatCssCustomization
  savedChatCss?: SavedChatCss[]
}
const hasTooManyCustomPresets = (input: unknown) =>
  isRecord(input) && Array.isArray(input.presets) &&
  input.presets.filter(preset => isRecord(preset) && preset.kind === 'custom').length > MAX_CUSTOM_PRESETS

const normalizeBackupGlobal = (input: unknown, fallback: unknown): GlobalSettings => {
  const current = normalizeGlobalSetting(fallback)
  const next = normalizeGlobalSetting(input)
  return {
    ytdLiveChat: next.ytdLiveChat ?? current.ytdLiveChat ?? DEFAULT_GLOBAL_SETTINGS.ytdLiveChat,
    themeMode: next.themeMode ?? current.themeMode ?? DEFAULT_GLOBAL_SETTINGS.themeMode,
  }
}

export const buildSettingsBackup = (current: CurrentSettings, exportedAt = new Date().toISOString()): SettingsBackup => {
  const backup: SettingsBackup = {
    version: SETTINGS_EXPORT_VERSION,
    exportedAt,
    globalSetting: normalizeBackupGlobal(current.globalSetting, DEFAULT_GLOBAL_SETTINGS),
    chatSettings: normalizeChatSettings(current.chatSettings, current.chatSettings),
    customCss: { ...(current.customCss ?? DEFAULT_CUSTOM_CSS) },
    savedChatCss: (current.savedChatCss ?? []).map(entry => ({ ...entry })),
  }
  assertAppearanceCapacity(backup.chatSettings)
  assertCustomCss(backup.customCss)
  assertSavedChatCss(backup.savedChatCss)
  // Same serialization as DataTransfer, not a character-count approximation.
  if (utf8Bytes(JSON.stringify(backup, null, 2)) > MAX_SETTINGS_BACKUP_BYTES) throw new Error('Settings backup is too large')
  return backup
}

export const normalizeSettingsBackup = (input: unknown, current: CurrentSettings): NormalizedSettingsBackup | null => {
  if (!isRecord(input) || !isRecord(input.globalSetting)) return null
  try {
    let chatSettings: ChatSettings
    if (input.version === SETTINGS_EXPORT_VERSION || input.version === 2) {
      if (!isRecord(input.chatSettings) || hasTooManyCustomPresets(input.chatSettings)) return null
      chatSettings = normalizeChatSettings({ ...current.chatSettings, ...input.chatSettings }, current.chatSettings)
    } else if (input.version === 1) {
      if (!isRecord(input.ytdLiveChat)) return null
      chatSettings = migrateSettings(input.ytdLiveChat)
      if (hasTooManyCustomPresets(chatSettings)) return null
    } else return null
    if (input.version === SETTINGS_EXPORT_VERSION &&
      (!isRecord(input.customCss) || typeof input.customCss.css !== 'string' || typeof input.customCss.enabled !== 'boolean' ||
        !Array.isArray(input.savedChatCss))) return null
    const css = input.version === SETTINGS_EXPORT_VERSION ? readCustomCssBackup(input) :
      { customCss: { ...DEFAULT_CUSTOM_CSS }, savedChatCss: [] }
    assertAppearanceCapacity(chatSettings)
    const normalized: NormalizedSettingsBackup = {
      version: SETTINGS_EXPORT_VERSION,
      globalSetting: normalizeBackupGlobal(input.globalSetting, current.globalSetting),
      chatSettings,
      ...css,
    }
    if (utf8Bytes(JSON.stringify(normalized, null, 2)) > MAX_SETTINGS_BACKUP_BYTES) return null
    // No CSS execution authorization and no emergency-stop preference is
    // accepted from any backup, including one exported on the same browser.
    return normalized
  } catch {
    return null
  }
}
