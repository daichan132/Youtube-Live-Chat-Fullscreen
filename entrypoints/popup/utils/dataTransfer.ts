import { browser } from 'wxt/browser'
import { buildSettingsBackup, type NormalizedSettingsBackup, normalizeSettingsBackup } from '@/shared/settings/backup'
import { getPersistedChatSettings, useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import type { ChatSettings } from '@/shared/settings/model'
import { normalizeChatSettings, normalizeGlobalSetting } from '@/shared/settings/normalizeSettings'
import { GLOBAL_SETTING_PERSIST, YTD_LIVE_CHAT_PERSIST } from '@/shared/settings/persistConfig'
import { useGlobalSettingStore } from '@/shared/stores/globalSettingStore'

const extractGlobalSettingData = () => {
  const { ytdLiveChat, themeMode } = useGlobalSettingStore.getState()
  return { ytdLiveChat, themeMode }
}

const extractChatSettings = () => getPersistedChatSettings(useChatSettingsStore.getState())

export type ExportData = {
  version: 2
  exportedAt: string
  globalSetting: Record<string, unknown>
  chatSettings: ChatSettings
}

export type LegacyExportData = {
  version: 1
  exportedAt?: string
  globalSetting: Record<string, unknown>
  ytdLiveChat: Record<string, unknown>
}

export type ImportData = ExportData | LegacyExportData

const currentSettings = () => ({
  globalSetting: extractGlobalSettingData(),
  chatSettings: extractChatSettings(),
})

export const isValidImportData = (data: unknown): data is ImportData => normalizeSettingsBackup(data, currentSettings()) !== null

export const sanitizeGlobalSetting = (raw: Record<string, unknown>) => normalizeGlobalSetting(raw)

export const sanitizeChatSettings = (raw: Record<string, unknown>) => normalizeChatSettings(raw, extractChatSettings())

export const buildExportData = (): ExportData => buildSettingsBackup(currentSettings())

const normalizeImport = (importData: unknown): NormalizedSettingsBackup => {
  const normalized = normalizeSettingsBackup(importData, currentSettings())
  if (!normalized) {
    const version =
      importData !== null && typeof importData === 'object' && 'version' in importData
        ? (importData as { version?: unknown }).version
        : undefined
    throw new Error(`Unsupported settings backup version: ${String(version)}`)
  }
  return normalized
}

export const persistImportedSettings = async (importData: unknown) => {
  const normalized = normalizeImport(importData)

  await browser.storage.local.set({
    [GLOBAL_SETTING_PERSIST.key]: JSON.stringify({
      state: normalized.globalSetting,
      version: GLOBAL_SETTING_PERSIST.version,
    }),
    [YTD_LIVE_CHAT_PERSIST.key]: JSON.stringify({
      state: normalized.chatSettings,
      version: YTD_LIVE_CHAT_PERSIST.version,
    }),
  })
}
