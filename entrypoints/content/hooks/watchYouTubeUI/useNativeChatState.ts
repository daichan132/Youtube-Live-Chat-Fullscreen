import { useEffect, useRef, useState } from 'react'
import {
  isNativeChatExpanded as getNativeChatExpanded,
  isNativeChatUsable as getNativeChatUsable,
} from '@/entrypoints/content/utils/nativeChatState'

export const useNativeChatState = (isFullscreen: boolean) => {
  const [isNativeChatUsable, setIsNativeChatUsable] = useState(false)
  const [isNativeChatExpanded, setIsNativeChatExpanded] = useState(false)
  const isFullscreenRef = useRef(isFullscreen)
  isFullscreenRef.current = isFullscreen

  useEffect(() => {
    // Single RAF for batched state updates - prevents excessive scheduling
    // when MutationObserver and ResizeObserver both fire for the same DOM change
    let cancelled = false
    let rafId: number | null = null
    let updatePending = false

    const scheduleUpdate = () => {
      if (updatePending) return
      updatePending = true
      rafId = requestAnimationFrame(() => {
        updatePending = false
        if (cancelled || isFullscreenRef.current) return
        setIsNativeChatExpanded(getNativeChatExpanded())
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
    setIsNativeChatExpanded(getNativeChatExpanded())
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
        scheduleUpdate()
      })
      observer.observe(getObserverTarget(), {
        subtree: true,
        attributes: true,
        childList: true,
        attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'live-chat-present-and-expanded', 'is-two-columns_'],
      })
    }

    const attachResizeObserver = () => {
      // Always disconnect and create fresh observer to avoid tracking stale elements
      if (resizeObserver) resizeObserver.disconnect()
      resizeObserver = new ResizeObserver(() => {
        scheduleUpdate()
      })
      const secondary = document.querySelector('#secondary')
      const chatFrame = document.querySelector('ytd-live-chat-frame')
      if (secondary) resizeObserver.observe(secondary)
      if (chatFrame) resizeObserver.observe(chatFrame)
    }

    const handleNavigate = () => {
      scheduleUpdate()
      attachObserver()
      attachResizeObserver()
    }

    attachObserver()
    attachResizeObserver()
    document.addEventListener('yt-navigate-finish', handleNavigate)

    return () => {
      cancelled = true
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (observer) observer.disconnect()
      if (resizeObserver) resizeObserver.disconnect()
      document.removeEventListener('yt-navigate-finish', handleNavigate)
    }
  }, [isFullscreen])

  return { isNativeChatUsable, isNativeChatExpanded }
}
