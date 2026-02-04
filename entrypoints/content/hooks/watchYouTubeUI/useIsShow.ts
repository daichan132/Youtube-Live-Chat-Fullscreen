/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react'
import {
  isNativeChatExpanded as getNativeChatExpanded,
  isNativeChatUsable as getNativeChatUsable,
} from '@/entrypoints/content/utils/nativeChatState'
import { useYTDLiveChatStore } from '@/shared/stores'
import { useHasPlayableLiveChat } from './useHasPlayableLiveChat'
import { useIsFullScreen } from './useIsFullscreen'

const gap = 10
export const useIsShow = () => {
  const [isChecked, setIsChecked] = useState<boolean>(false)
  const hasPlayableChat = useHasPlayableLiveChat()

  const [isTop, setIsTop] = useState<boolean>(false)
  const isFullscreen = useIsFullScreen()
  const updateIsTopBasedOnMasthead = useCallback((element: Element, fs: boolean) => {
    // Prefer explicit fullscreen state over DOM attributes which can flicker
    // when the window loses focus or UI updates.
    if (fs || element.hasAttribute('masthead-hidden')) {
      setIsTop(true)
    } else {
      setIsTop(false)
    }
  }, [])
  useEffect(() => {
    // Initialize based on current fullscreen state and masthead visibility
    const ytdAppElement = document.querySelector('ytd-app')
    if (!ytdAppElement) return
    updateIsTopBasedOnMasthead(ytdAppElement, isFullscreen)
    // biome-ignore lint/suspicious/noExplicitAny: mutations parameter from MutationObserver
    const mastheadHidden = (mutations: any) => {
      for (const mutation of mutations) {
        updateIsTopBasedOnMasthead(mutation.target, isFullscreen)
      }
    }
    const mutationObserver = new MutationObserver(mastheadHidden)
    mutationObserver.observe(ytdAppElement, {
      // Only need masthead-hidden here; fullscreen is derived from document state
      attributeFilter: ['masthead-hidden'],
      attributes: true,
    })
    return () => {
      mutationObserver.disconnect()
    }
  }, [updateIsTopBasedOnMasthead, isFullscreen])

  const [isNativeChatOpen, setIsNativeChatOpen] = useState<boolean>(false)
  const [isNativeChatExpanded, setIsNativeChatExpanded] = useState<boolean>(false)
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

    const observer = new MutationObserver(() => {
      updateNativeChatExpanded()
      updateNativeChatOpen()
    })
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      childList: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'live-chat-present-and-expanded', 'is-two-columns_'],
    })

    const resizeObserver = new ResizeObserver(() => {
      updateNativeChatOpen()
    })
    const attachResizeObserver = () => {
      const secondary = document.querySelector('#secondary')
      const chatFrame = document.querySelector('ytd-live-chat-frame')
      if (secondary) resizeObserver.observe(secondary)
      if (chatFrame) resizeObserver.observe(chatFrame)
    }
    attachResizeObserver()

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
    }
  }, [isFullscreen])
  useEffect(() => {
    if (hasPlayableChat && isTop) {
      /* ----------------------- YLC is in outside of window ---------------------- */
      const innerWidth = window.innerWidth
      const innerHeight = window.innerHeight
      const {
        size: { width, height },
        coordinates: { x, y },
        setDefaultPosition,
      } = useYTDLiveChatStore.getState()
      if (x + gap < 0 || innerWidth + gap < width + x || y + gap < 0 || innerHeight + gap < height + y) {
        setDefaultPosition()
      }
      setIsChecked(true)
    } else {
      setIsChecked(false)
    }
  }, [isTop, hasPlayableChat])
  return { isShow: hasPlayableChat && isTop && isChecked, isNativeChatOpen, isNativeChatExpanded }
}
