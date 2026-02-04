import { useEffect, useState } from 'react'
import {
  isNativeChatExpanded as getNativeChatExpanded,
  isNativeChatUsable as getNativeChatUsable,
} from '@/entrypoints/content/utils/nativeChatState'

export const useNativeChatState = (isFullscreen: boolean) => {
  const [isNativeChatUsable, setIsNativeChatUsable] = useState(false)
  const [isNativeChatExpanded, setIsNativeChatExpanded] = useState(false)

  useEffect(() => {
    // Debounce flags to prevent redundant updates when MutationObserver
    // and ResizeObserver both fire for the same DOM change
    let expandedUpdatePending = false
    let usableUpdatePending = false

    const updateNativeChatExpanded = () => {
      if (expandedUpdatePending) return
      expandedUpdatePending = true
      requestAnimationFrame(() => {
        expandedUpdatePending = false
        setIsNativeChatExpanded(getNativeChatExpanded())
      })
    }

    const updateNativeChatUsable = () => {
      if (usableUpdatePending) return
      usableUpdatePending = true
      requestAnimationFrame(() => {
        usableUpdatePending = false
        setIsNativeChatUsable(getNativeChatUsable())
      })
    }

    // Fullscreen hides native chat but leaves DOM in place; treat it as closed.
    if (isFullscreen) {
      setIsNativeChatUsable(false)
      setIsNativeChatExpanded(false)
      return
    }

    // Immediately sync with DOM state when exiting fullscreen
    updateNativeChatExpanded()
    setIsNativeChatUsable(getNativeChatUsable())
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
        updateNativeChatUsable()
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
          updateNativeChatUsable()
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
      updateNativeChatUsable()
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

  return { isNativeChatUsable, isNativeChatExpanded }
}
