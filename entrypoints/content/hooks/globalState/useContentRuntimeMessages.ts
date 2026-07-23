import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveLanguageCode } from '@/shared/i18n/language'
import { useGlobalSettingStore } from '@/shared/stores/globalSettingStore'
import { useYTDLiveChatHistoryStore } from '@/shared/stores/ytdLiveChatHistoryStore'
import { useYTDLiveChatStore } from '@/shared/stores/ytdLiveChatStore'
import type { ThemeMode } from '@/shared/theme'
import { changeYLCStyle } from '../ylcStyleChange/ylcStyleApplier'

const isThemeMode = (value: unknown): value is ThemeMode => value === 'light' || value === 'dark' || value === 'system'

export const useContentRuntimeMessages = () => {
  const { i18n } = useTranslation()
  const setThemeMode = useGlobalSettingStore(state => state.setThemeMode)
  const setYTDLiveChat = useGlobalSettingStore(state => state.setYTDLiveChat)

  useEffect(() => {
    const rehydrateAndApply = async () => {
      await useGlobalSettingStore.persist.rehydrate()
      await useYTDLiveChatStore.persist.rehydrate()
      useYTDLiveChatHistoryStore.getState().clear()

      const {
        fontSize,
        fontFamily,
        bgColor,
        blur,
        fontColor,
        membershipNameColor,
        userNameDisplay,
        space,
        userIconDisplay,
        superChatBarDisplay,
      } = useYTDLiveChatStore.getState()

      changeYLCStyle({
        bgColor,
        blur,
        fontColor,
        membershipNameColor,
        fontFamily,
        fontSize,
        space,
        userNameDisplay,
        userIconDisplay,
        superChatBarDisplay,
      })
    }

    const handleMessage = (message: unknown) => {
      if (!message || typeof message !== 'object') return

      const runtimeMessage = message as Record<string, unknown>

      if (runtimeMessage.message === 'language' && typeof runtimeMessage.language === 'string') {
        i18n.changeLanguage(resolveLanguageCode(runtimeMessage.language))
        return
      }

      if (runtimeMessage.message === 'themeMode' && isThemeMode(runtimeMessage.themeMode)) {
        setThemeMode(runtimeMessage.themeMode)
        return
      }

      if (runtimeMessage.message === 'ytdLiveChat' && typeof runtimeMessage.ytdLiveChat === 'boolean') {
        setYTDLiveChat(runtimeMessage.ytdLiveChat)
        return
      }

      if (runtimeMessage.message === 'settingsImported') {
        void rehydrateAndApply()
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [i18n, setThemeMode, setYTDLiveChat])
}
