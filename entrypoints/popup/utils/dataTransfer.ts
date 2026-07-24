import { browser } from 'wxt/browser'
import {
  type NormalizedSettingsBackup,
  normalizeGlobalSetting,
  normalizePersistedYTDLiveChatState,
  normalizeSettingsBackup,
} from '@/shared/settings/normalizeSettings'
import { GLOBAL_SETTING_PERSIST, SETTINGS_EXPORT_VERSION, YTD_LIVE_CHAT_PERSIST } from '@/shared/settings/persistConfig'
import { useGlobalSettingStore } from '@/shared/stores/globalSettingStore'
import { useYTDLiveChatStore } from '@/shared/stores/ytdLiveChatStore'

const YTD_LIVE_CHAT_DATA_KEYS = [
  'presetItemIds',
  'presetItemStyles',
  'presetItemTitles',
  'addPresetEnabled',
  'coordinates',
  'size',
  'bgColor',
  'fontColor',
  'membershipNameColor',
  'fontFamily',
  'fontSize',
  'blur',
  'space',
  'alwaysOnDisplay',
  'chatOnlyDisplay',
  'userNameDisplay',
  'userIconDisplay',
  'superChatBarDisplay',
] as const

const extractGlobalSettingData = () => {
  const { ytdLiveChat, themeMode } = useGlobalSettingStore.getState()
  return { ytdLiveChat, themeMode }
}

const extractYTDLiveChatData = () => {
  const state = useYTDLiveChatStore.getState()
  return Object.fromEntries(YTD_LIVE_CHAT_DATA_KEYS.map(key => [key, state[key]]))
}

export type ExportData = {
  version: number
  exportedAt: string
  globalSetting: Record<string, unknown>
  ytdLiveChat: Record<string, unknown>
}

const currentSettings = () => ({
  globalSetting: extractGlobalSettingData(),
  ytdLiveChat: extractYTDLiveChatData(),
})

export const isValidImportData = (data: unknown): data is ExportData => normalizeSettingsBackup(data, currentSettings()) !== null

export const sanitizeGlobalSetting = (raw: Record<string, unknown>) => normalizeGlobalSetting(raw)

export const sanitizeYTDLiveChat = (raw: Record<string, unknown>) => normalizePersistedYTDLiveChatState(raw)

export const buildExportData = (): ExportData => ({
  version: SETTINGS_EXPORT_VERSION,
  exportedAt: new Date().toISOString(),
  globalSetting: extractGlobalSettingData(),
  ytdLiveChat: extractYTDLiveChatData(),
})

const normalizeImport = (importData: ExportData): NormalizedSettingsBackup => {
  const normalized = normalizeSettingsBackup(importData, currentSettings())
  if (!normalized) {
    throw new Error(`Unsupported settings backup version: ${String(importData.version)}`)
  }
  return normalized
}

export const persistImportedSettings = async (importData: ExportData) => {
  const normalized = normalizeImport(importData)

  await browser.storage.local.set({
    [GLOBAL_SETTING_PERSIST.key]: JSON.stringify({
      state: normalized.globalSetting,
      version: GLOBAL_SETTING_PERSIST.version,
    }),
    [YTD_LIVE_CHAT_PERSIST.key]: JSON.stringify({
      state: normalized.ytdLiveChat,
      version: YTD_LIVE_CHAT_PERSIST.version,
    }),
  })
}
