import { useEffect } from 'react'
import { resolveLanguageCode } from '@/shared/i18n/language'
import { useAppRuntime } from '@/shared/runtime/AppProvider'

export const useContentRuntimeMessages = () => {
  const runtime = useAppRuntime()

  useEffect(() => {
    const handleMessage = (message: unknown) => {
      if (!message || typeof message !== 'object') return

      const runtimeMessage = message as Record<string, unknown>

      if (runtimeMessage.message === 'language' && typeof runtimeMessage.language === 'string') {
        void runtime.setLocale(resolveLanguageCode(runtimeMessage.language))
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [runtime])
}
