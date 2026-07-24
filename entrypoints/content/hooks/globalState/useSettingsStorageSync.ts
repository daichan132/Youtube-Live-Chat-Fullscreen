import { useEffect } from 'react'
import { browser } from 'wxt/browser'
import { fitGeometryToViewport } from '@/shared/settings/fitGeometryToViewport'
import { getStorageChangeOriginId, SETTINGS_STORAGE_ORIGIN_ID } from '@/shared/settings/originAwareStorage'
import { GLOBAL_SETTING_PERSIST, YTD_LIVE_CHAT_PERSIST } from '@/shared/settings/persistConfig'
import { useGlobalSettingStore } from '@/shared/stores/globalSettingStore'
import { useYTDLiveChatHistoryStore } from '@/shared/stores/ytdLiveChatHistoryStore'
import { useYTDLiveChatStore } from '@/shared/stores/ytdLiveChatStore'

const GEOMETRY_VIEWPORT_PADDING = 10

const isOwnStorageChange = (change: unknown) => getStorageChangeOriginId(change) === SETTINGS_STORAGE_ORIGIN_ID

const fitRehydratedGeometry = () => {
  const { coordinates, size, setGeometry } = useYTDLiveChatStore.getState()
  const next = fitGeometryToViewport(
    { coordinates, size },
    { width: window.innerWidth, height: window.innerHeight },
    GEOMETRY_VIEWPORT_PADDING,
  )
  if (
    next.coordinates.x === coordinates.x &&
    next.coordinates.y === coordinates.y &&
    next.size.width === size.width &&
    next.size.height === size.height
  ) {
    return
  }
  setGeometry(next)
}

export const useSettingsStorageSync = () => {
  useEffect(() => {
    const handleChanged = (changes: Record<string, unknown>, areaName: string) => {
      if (areaName !== 'local') return

      const globalChanged = GLOBAL_SETTING_PERSIST.key in changes
      const ytdChanged = YTD_LIVE_CHAT_PERSIST.key in changes
      if (!globalChanged && !ytdChanged) return
      const shouldRehydrateGlobal = globalChanged && !isOwnStorageChange(changes[GLOBAL_SETTING_PERSIST.key])
      const shouldRehydrateYTD = ytdChanged && !isOwnStorageChange(changes[YTD_LIVE_CHAT_PERSIST.key])

      void Promise.all([
        shouldRehydrateGlobal ? useGlobalSettingStore.persist.rehydrate() : Promise.resolve(),
        shouldRehydrateYTD ? useYTDLiveChatStore.persist.rehydrate() : Promise.resolve(),
      ]).then(() => {
        if (!shouldRehydrateYTD) return
        useYTDLiveChatHistoryStore.getState().clear()
        fitRehydratedGeometry()
      })
    }

    browser.storage.onChanged.addListener(handleChanged)
    return () => {
      browser.storage.onChanged.removeListener(handleChanged)
    }
  }, [])
}
