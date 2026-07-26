import { getStorageChangeOriginId, SETTINGS_STORAGE_ORIGIN_ID } from './originAwareStorage'
import { GLOBAL_SETTING_PERSIST, YTD_LIVE_CHAT_PERSIST } from './persistConfig'

export type SettingsStorageSyncDecision = {
  rehydrateGlobal: boolean
  rehydrateChatSettings: boolean
}

const isExternalStorageChange = (change: unknown) => getStorageChangeOriginId(change) !== SETTINGS_STORAGE_ORIGIN_ID

export const resolveSettingsStorageSync = (changes: Record<string, unknown>, areaName: string): SettingsStorageSyncDecision => {
  if (areaName !== 'local') {
    return {
      rehydrateGlobal: false,
      rehydrateChatSettings: false,
    }
  }

  return {
    rehydrateGlobal: GLOBAL_SETTING_PERSIST.key in changes && isExternalStorageChange(changes[GLOBAL_SETTING_PERSIST.key]),
    rehydrateChatSettings: YTD_LIVE_CHAT_PERSIST.key in changes && isExternalStorageChange(changes[YTD_LIVE_CHAT_PERSIST.key]),
  }
}
