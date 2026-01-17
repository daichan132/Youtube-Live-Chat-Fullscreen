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

  const [isTheaterChatMode, setIsTheaterChatMode] = useState<boolean>(false)
  useEffect(() => {
    setIsTheaterChatMode(false)
    const ytdWatchGridElement = document.querySelector('ytd-watch-grid')
    if (!ytdWatchGridElement) return
    if (ytdWatchGridElement.hasAttribute('is-two-columns_') && ytdWatchGridElement.hasAttribute('live-chat-present-and-expanded')) {
      setIsTheaterChatMode(true)
    } else {
      setIsTheaterChatMode(false)
    }
  }, [])
  useEffect(() => {
    if (isChat && isTop && !isTheaterChatMode) {
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
  }, [isTop, isChat, isTheaterChatMode])
  return isChat && isTop && isChecked && !isTheaterChatMode
}
