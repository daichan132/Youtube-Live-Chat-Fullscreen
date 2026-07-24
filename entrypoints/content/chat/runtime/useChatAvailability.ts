import { useEffect, useState } from 'react'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import { canToggleFullscreenChat, hasFullscreenChatSource } from './hasFullscreenChatSource'
import { getUnavailableCurrentLiveChatVideoId } from './liveChatAvailability'
import type { ChatMode } from './types'

export type ChatAvailability = {
  videoId: string | null
  mode: ChatMode
  canShowSwitch: boolean
  sourceReady: boolean
  terminallyUnavailable: boolean
}

const CHECK_INTERVAL_MS = 1000
const CHAT_BOUNDARY_SELECTOR = 'ytd-live-chat-frame, #chatframe, #chat-container, #show-hide-button'

const initialAvailability = (mode: ChatMode, videoId: string | null): ChatAvailability => ({
  videoId,
  mode,
  canShowSwitch: false,
  sourceReady: false,
  terminallyUnavailable: false,
})

const mutationTouchesChatBoundary = (mutation: MutationRecord) => {
  if (mutation.type !== 'childList') return false
  const isRelevant = (node: Node) =>
    node instanceof Element && (node.matches(CHAT_BOUNDARY_SELECTOR) || node.querySelector(CHAT_BOUNDARY_SELECTOR) !== null)
  return [...mutation.addedNodes, ...mutation.removedNodes].some(isRelevant)
}

export const useChatAvailability = (mode: ChatMode, videoId: string | null): ChatAvailability => {
  const unavailableVideoId = useYTDLiveChatNoLsStore(state => state.unavailableLiveChatVideoId)
  const setUnavailableVideoId = useYTDLiveChatNoLsStore(state => state.setUnavailableLiveChatVideoId)
  const [availability, setAvailability] = useState(() => initialAvailability(mode, videoId))

  useEffect(() => {
    if (!videoId || !unavailableVideoId || unavailableVideoId === videoId) return
    setUnavailableVideoId(null)
  }, [setUnavailableVideoId, unavailableVideoId, videoId])

  useEffect(() => {
    let canShowSwitchLatched = false
    let sourceReadyLatched = false
    let animationFrame: number | null = null

    const sync = () => {
      if (mode === 'none' || !videoId) {
        setAvailability(initialAvailability(mode, videoId))
        return
      }

      const currentUnavailableVideoId = useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId
      const detectedUnavailableVideoId = mode === 'live' ? getUnavailableCurrentLiveChatVideoId() : null
      const terminallyUnavailable = mode === 'live' && (currentUnavailableVideoId === videoId || detectedUnavailableVideoId === videoId)

      if (detectedUnavailableVideoId === videoId && currentUnavailableVideoId !== videoId) {
        setUnavailableVideoId(videoId)
      }

      if (terminallyUnavailable) {
        setAvailability({
          videoId,
          mode,
          canShowSwitch: false,
          sourceReady: false,
          terminallyUnavailable: true,
        })
        return
      }

      const canShowSwitchNow = canToggleFullscreenChat(mode)
      const sourceReadyNow = hasFullscreenChatSource(mode)
      if (mode === 'live' && canShowSwitchNow) canShowSwitchLatched = true
      if (sourceReadyNow) sourceReadyLatched = true

      setAvailability({
        videoId,
        mode,
        canShowSwitch: mode === 'live' ? canShowSwitchLatched : canShowSwitchNow,
        sourceReady: sourceReadyLatched,
        terminallyUnavailable: false,
      })
    }

    const scheduleSync = () => {
      if (animationFrame !== null) return
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null
        sync()
      })
    }

    sync()
    const interval = window.setInterval(sync, CHECK_INTERVAL_MS)
    const observer = new MutationObserver(mutations => {
      if (mutations.some(mutationTouchesChatBoundary)) scheduleSync()
    })
    if (document.body) observer.observe(document.body, { childList: true, subtree: true })
    document.addEventListener('yt-navigate-finish', scheduleSync)

    return () => {
      window.clearInterval(interval)
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
      observer.disconnect()
      document.removeEventListener('yt-navigate-finish', scheduleSync)
    }
  }, [mode, setUnavailableVideoId, videoId])

  if (availability.mode !== mode || availability.videoId !== videoId) {
    return initialAvailability(mode, videoId)
  }

  return availability
}
