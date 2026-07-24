import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveLanguageCode } from '@/shared/i18n/language'

export const useContentRuntimeMessages = () => {
  const { i18n } = useTranslation()

  useEffect(() => {
    const handleMessage = (message: unknown) => {
      if (!message || typeof message !== 'object') return

      const runtimeMessage = message as Record<string, unknown>

      if (runtimeMessage.message === 'language' && typeof runtimeMessage.language === 'string') {
        i18n.changeLanguage(resolveLanguageCode(runtimeMessage.language))
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [i18n])
}
