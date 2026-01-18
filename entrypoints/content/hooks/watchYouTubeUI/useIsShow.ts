/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react'

import { useYTDLiveChatStore } from '@/shared/stores'
import { getYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { useIsFullScreen } from './useIsFullscreen'

const gap = 10
export const useIsShow = () => {
  const [isChecked, setIsChecked] = useState<boolean>(false)
  const [isChat, setIsChat] = useState<boolean>(false)

  useEffect(() => {
    setIsChat(false)
    // Polls every second (up to 100 attempts) to check if the iframe has loaded
    let count = 0
    const interval = setInterval(() => {
      const liveChatReplay: HTMLIFrameElement | null = document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame')
      const moviePlayer: HTMLElement | null = document.getElementById('movie_player')
      const watchFlexy = document.querySelector('ytd-watch-flexy')
      const watchGrid = document.querySelector('ytd-watch-grid')
      const hasLiveChatAttribute =
        watchFlexy?.hasAttribute('live-chat-present') ||
        watchFlexy?.hasAttribute('live-chat-present-and-expanded') ||
        watchGrid?.hasAttribute('live-chat-present') ||
        watchGrid?.hasAttribute('live-chat-present-and-expanded')
      const isLiveChatReady = !!liveChatReplay && !liveChatReplay.contentDocument?.location.href?.includes('about:blank')
      const videoId = getYouTubeVideoId()

      if (moviePlayer && (isLiveChatReady || hasLiveChatAttribute || videoId)) {
        setIsChat(true)
        clearInterval(interval)
      }
      count++
      if (count > 100) {
        clearInterval(interval)
      }
    }, 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])

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
    const updateNativeChatExpanded = () => {
      const watchFlexy = document.querySelector('ytd-watch-flexy')
      const watchGrid = document.querySelector('ytd-watch-grid')
      const hasExpandedChat =
        watchFlexy?.hasAttribute('live-chat-present-and-expanded') ||
        watchGrid?.hasAttribute('live-chat-present-and-expanded')
      const chatContainer = document.querySelector('#chat-container')
      const chatFrameHost = document.querySelector('ytd-live-chat-frame')
      const isHidden =
        chatContainer?.hasAttribute('hidden') ||
        chatFrameHost?.hasAttribute('hidden') ||
        chatContainer?.getAttribute('aria-hidden') === 'true' ||
        chatFrameHost?.getAttribute('aria-hidden') === 'true'
      const hasChatDom = Boolean(chatContainer && chatFrameHost)
      setIsNativeChatExpanded(Boolean(hasExpandedChat && hasChatDom && !isHidden))
    }

    const isNativeChatUsable = () => {
      const secondary = document.querySelector('#secondary') as HTMLElement | null
      const chatContainer = document.querySelector('#chat-container') as HTMLElement | null
      const chatFrameHost = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
      const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
      if (!secondary || !chatContainer || !chatFrameHost || !chatFrame) return false

      const secondaryStyle = window.getComputedStyle(secondary)
      const containerStyle = window.getComputedStyle(chatContainer)
      const hostStyle = window.getComputedStyle(chatFrameHost)
      const isHidden =
        secondaryStyle.display === 'none' ||
        secondaryStyle.visibility === 'hidden' ||
        containerStyle.display === 'none' ||
        containerStyle.visibility === 'hidden' ||
        hostStyle.display === 'none' ||
        hostStyle.visibility === 'hidden'
      if (isHidden) return false

      const pointerBlocked =
        secondaryStyle.pointerEvents === 'none' ||
        containerStyle.pointerEvents === 'none' ||
        hostStyle.pointerEvents === 'none'
      if (pointerBlocked) return false

      const secondaryBox = secondary.getBoundingClientRect()
      const chatBox = chatFrameHost.getBoundingClientRect()
      const frameBox = chatFrame.getBoundingClientRect()
      return secondaryBox.width > 80 && chatBox.width > 80 && chatBox.height > 120 && frameBox.height > 120
    }

    const updateNativeChatOpen = () => {
      setIsNativeChatOpen(isNativeChatUsable())
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
  }, [])
  useEffect(() => {
    if (isChat && isTop) {
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
  }, [isTop, isChat])
  return { isShow: isChat && isTop && isChecked, isNativeChatOpen, isNativeChatExpanded }
}
