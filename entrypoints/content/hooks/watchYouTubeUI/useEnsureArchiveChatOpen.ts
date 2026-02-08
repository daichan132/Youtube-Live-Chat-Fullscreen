import { useEffect } from 'react'
import { getLiveChatIframe, isArchiveChatPlayable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { isYouTubeLiveNow } from '@/entrypoints/content/utils/isYouTubeLiveNow'
import { openArchiveNativeChatPanel } from '@/entrypoints/content/utils/nativeChat'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'

const MAX_ENSURE_DURATION_MS = 60000
const RETRY_INTERVAL_MS = 1000
const OPEN_CLICK_COOLDOWN_MS = 2000

const isFullscreenActive = () => document.fullscreenElement !== null

const debugLog = (message: string, details?: Record<string, unknown>) => {
  if (!import.meta.env.DEV) return
  // biome-ignore lint/suspicious/noConsole: Intentional debug logging for development troubleshooting
  console.debug(`[YLC Archive Chat] ${message}`, details ?? '')
}

export const useEnsureArchiveChatOpen = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return

    let isActive = true
    let timeoutId: number | null = null
    let startTime = 0
    let lastOpenClickedAt = 0
    let playableStreak = 0
    const { setIsAutoOpeningNativeChat } = useYTDLiveChatNoLsStore.getState()

    const clearTimer = () => {
      if (!timeoutId) return
      window.clearTimeout(timeoutId)
      timeoutId = null
    }

    const stopEnsure = () => {
      clearTimer()
      setIsAutoOpeningNativeChat(false)
    }

    const scheduleNext = () => {
      clearTimer()
      timeoutId = window.setTimeout(runCheck, RETRY_INTERVAL_MS)
    }

    const hasTimedOut = () => Date.now() - startTime >= MAX_ENSURE_DURATION_MS

    const runCheck = () => {
      if (!isActive) return

      if (!isFullscreenActive()) {
        scheduleNext()
        return
      }

      if (isYouTubeLiveNow()) {
        debugLog('stopped ensure loop because stream is live')
        stopEnsure()
        return
      }

      const nativeIframe = getLiveChatIframe() ?? useYTDLiveChatNoLsStore.getState().iframeElement
      if (isArchiveChatPlayable(nativeIframe)) {
        playableStreak += 1
        if (playableStreak >= 2) {
          debugLog('archive native chat became playable')
          stopEnsure()
          return
        }
        scheduleNext()
        return
      }
      playableStreak = 0

      if (hasTimedOut()) {
        debugLog('stopped ensure loop because timeout reached')
        stopEnsure()
        return
      }

      const canClickOpen = Date.now() - lastOpenClickedAt >= OPEN_CLICK_COOLDOWN_MS
      if (canClickOpen) {
        const selector = openArchiveNativeChatPanel()
        if (selector) {
          lastOpenClickedAt = Date.now()
          setIsAutoOpeningNativeChat(true)
          debugLog('requested archive native chat open', { selector })
        } else {
          debugLog('archive native chat open button not found')
        }
      }

      scheduleNext()
    }

    const startEnsure = () => {
      startTime = Date.now()
      lastOpenClickedAt = 0
      playableStreak = 0
      clearTimer()
      runCheck()
    }

    const handleNavigate = () => {
      if (!isActive) return
      startEnsure()
    }

    startEnsure()
    document.addEventListener('yt-navigate-finish', handleNavigate)

    return () => {
      isActive = false
      clearTimer()
      setIsAutoOpeningNativeChat(false)
      document.removeEventListener('yt-navigate-finish', handleNavigate)
    }
  }, [enabled])
}
