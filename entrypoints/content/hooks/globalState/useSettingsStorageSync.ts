import { useEffect } from 'react'
import { browser } from 'wxt/browser'
import { getStorageChangeOriginId, SETTINGS_STORAGE_ORIGIN_ID } from '@/shared/settings/originAwareStorage'
import { GLOBAL_SETTING_PERSIST, YTD_LIVE_CHAT_PERSIST } from '@/shared/settings/persistConfig'
import { useGlobalSettingStore } from '@/shared/stores/globalSettingStore'
import { useYTDLiveChatHistoryStore } from '@/shared/stores/ytdLiveChatHistoryStore'
import { useYTDLiveChatStore } from '@/shared/stores/ytdLiveChatStore'
import { areYLCStylesEqual, getYLCStyleSnapshot } from '@/shared/utils/ylcStyleSnapshot'

const isOwnStorageChange = (change: unknown) => getStorageChangeOriginId(change) === SETTINGS_STORAGE_ORIGIN_ID

export const useSettingsStorageSync = () => {
  useEffect(() => {
    const handleChanged = (changes: Record<string, unknown>, areaName: string) => {
      if (areaName !== 'local') return

      const globalChanged = GLOBAL_SETTING_PERSIST.key in changes
      const ytdChanged = YTD_LIVE_CHAT_PERSIST.key in changes
      if (!globalChanged && !ytdChanged) return
      const shouldRehydrateGlobal = globalChanged && !isOwnStorageChange(changes[GLOBAL_SETTING_PERSIST.key])
      const shouldRehydrateYTD = ytdChanged && !isOwnStorageChange(changes[YTD_LIVE_CHAT_PERSIST.key])
      const previousStyle = shouldRehydrateYTD ? getYLCStyleSnapshot(useYTDLiveChatStore.getState()) : null

      void Promise.all([
        shouldRehydrateGlobal ? useGlobalSettingStore.persist.rehydrate() : Promise.resolve(),
        shouldRehydrateYTD ? useYTDLiveChatStore.persist.rehydrate() : Promise.resolve(),
      ]).then(() => {
        if (!shouldRehydrateYTD || !previousStyle) return
        const nextStyle = getYLCStyleSnapshot(useYTDLiveChatStore.getState())
        if (!areYLCStylesEqual(previousStyle, nextStyle)) {
          useYTDLiveChatHistoryStore.getState().clear()
        }
      })
    }

    browser.storage.onChanged.addListener(handleChanged)
    return () => {
      browser.storage.onChanged.removeListener(handleChanged)
    }
  }, [])
}
