import { useEffect, useState } from 'react'
import {
  isNativeChatExpanded as getNativeChatExpanded,
  isNativeChatUsable as getNativeChatUsable,
} from '@/entrypoints/content/utils/nativeChatState'

export const useNativeChatState = (isFullscreen: boolean) => {
  const [isNativeChatOpen, setIsNativeChatOpen] = useState(false)
  const [isNativeChatExpanded, setIsNativeChatExpanded] = useState(false)

  useEffect(() => {
    // Fullscreen hides native chat but leaves DOM in place; treat it as closed.
    if (isFullscreen) {
      setIsNativeChatOpen(false)
      setIsNativeChatExpanded(false)
      return
    }

    const updateNativeChatExpanded = () => {
      setIsNativeChatExpanded(getNativeChatExpanded())
    }

    const updateNativeChatOpen = () => {
      setIsNativeChatOpen(getNativeChatUsable())
    }

    updateNativeChatExpanded()
    updateNativeChatOpen()
    if (!document.body) return

    let observer: MutationObserver | null = null
    let resizeObserver: ResizeObserver | null = null

    const getObserverTarget = () => {
      const watchFlexy = document.querySelector('ytd-watch-flexy')
      if (watchFlexy) return watchFlexy
      const watchGrid = document.querySelector('ytd-watch-grid')
      if (watchGrid) return watchGrid
      const secondary = document.querySelector('#secondary')
      if (secondary) return secondary
      return document.body
    }

    const attachObserver = () => {
      if (observer) observer.disconnect()
      observer = new MutationObserver(() => {
        updateNativeChatExpanded()
        updateNativeChatOpen()
      })
      observer.observe(getObserverTarget(), {
        subtree: true,
        attributes: true,
        childList: true,
        attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'live-chat-present-and-expanded', 'is-two-columns_'],
      })
    }

    const attachResizeObserver = () => {
      if (!resizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          updateNativeChatOpen()
        })
      } else {
        resizeObserver.disconnect()
      }
      const secondary = document.querySelector('#secondary')
      const chatFrame = document.querySelector('ytd-live-chat-frame')
      if (secondary) resizeObserver.observe(secondary)
      if (chatFrame) resizeObserver.observe(chatFrame)
    }

    const handleNavigate = () => {
      updateNativeChatExpanded()
      updateNativeChatOpen()
      attachObserver()
      attachResizeObserver()
    }

    attachObserver()
    attachResizeObserver()
    document.addEventListener('yt-navigate-finish', handleNavigate)

    return () => {
      if (observer) observer.disconnect()
      if (resizeObserver) resizeObserver.disconnect()
      document.removeEventListener('yt-navigate-finish', handleNavigate)
    }
  }, [isFullscreen])

  return { isNativeChatOpen, isNativeChatExpanded }
}
