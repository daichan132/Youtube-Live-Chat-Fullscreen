import { useCallback, useEffect, useState } from 'react'
import { hasPlayableLiveChat } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { useNativeChatState } from './useNativeChatState'
import { usePollingWithNavigate } from './usePollingWithNavigate'

const CHAT_AVAILABILITY_INTERVAL_MS = 2000
export const useIsShow = (isFullscreen: boolean) => {
  const checkPlayableChat = useCallback(() => hasPlayableLiveChat(), [])
  const hasPlayableChat = usePollingWithNavigate({
    checkFn: checkPlayableChat,
    stopOnSuccess: false,
    intervalMs: CHAT_AVAILABILITY_INTERVAL_MS,
  })
  const [isTop, setIsTop] = useState(false)
  const [isChatPositionChecked, setIsChatPositionChecked] = useState(false)
  const { isNativeChatUsable, isNativeChatExpanded } = useNativeChatState(isFullscreen)

  useEffect(() => {
    const ytdAppElement = document.querySelector('ytd-app')
    if (!ytdAppElement) return

    const syncMastheadTop = (element: Element) => {
      // Prefer explicit fullscreen state over DOM attributes which can flicker
      // when the window loses focus or UI updates.
      setIsTop(isFullscreen || element.hasAttribute('masthead-hidden'))
    }

    syncMastheadTop(ytdAppElement)

    const observer = new MutationObserver((mutations: MutationRecord[]) => {
      for (const mutation of mutations) {
        if (mutation.target instanceof Element) {
          syncMastheadTop(mutation.target)
        }
      }
    })
    observer.observe(ytdAppElement, {
      attributeFilter: ['masthead-hidden'],
      attributes: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [isFullscreen])

  useEffect(() => {
    setIsChatPositionChecked(hasPlayableChat && isTop)
  }, [hasPlayableChat, isTop])

  return { isShow: hasPlayableChat && isTop && isChatPositionChecked, isNativeChatUsable, isNativeChatExpanded }
}
