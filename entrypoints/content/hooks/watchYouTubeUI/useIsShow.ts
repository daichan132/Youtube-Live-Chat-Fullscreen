/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react'

import { useYTDLiveChatStore } from '@/shared/stores'

const gap = 10
export const useIsShow = () => {
  const [isChecked, setIsChecked] = useState<boolean>(false)
  const [isChat, setIsChat] = useState<boolean>(false)

  useEffect(() => {
    setIsChat(false)
    // Polls every second (up to 100 attempts) to check if the iframe has loaded
    let count = 0
    const interval = setInterval(() => {
      const liveChatReplay: HTMLIFrameElement | null = document.querySelector('iframe.ytd-live-chat-frame')
      const moviePlayer: HTMLElement | null = document.getElementById('movie_player')
      if (liveChatReplay && moviePlayer && !liveChatReplay.contentDocument?.location.href?.includes('about:blank')) {
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
  const updateIsTopBasedOnMasthead = useCallback((element: Element) => {
    if (element.hasAttribute('masthead-hidden') || element.hasAttribute('player-fullscreen')) {
      setIsTop(true)
    } else {
      setIsTop(false)
    }
  }, [])
  useEffect(() => {
    setIsTop(true)
    const ytdAppElement = document.querySelector('ytd-app')
    if (!ytdAppElement) return
    updateIsTopBasedOnMasthead(ytdAppElement)
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const mastheadHidden = (mutations: any) => {
      for (const mutation of mutations) {
        updateIsTopBasedOnMasthead(mutation.target)
      }
    }
    const mutationObserver = new MutationObserver(mastheadHidden)
    mutationObserver.observe(ytdAppElement, {
      attributeFilter: ['masthead-hidden', 'player-fullscreen'],
      attributes: true,
    })
    return () => {
      mutationObserver.disconnect()
    }
  }, [updateIsTopBasedOnMasthead])

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
