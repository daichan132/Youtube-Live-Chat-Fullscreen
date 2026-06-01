import { useEffect } from 'react'
import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { getLiveChatDocument, isArchiveChatPlayable, isLiveChatUnavailable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { isYouTubeLiveNow } from '@/entrypoints/content/utils/isYouTubeLiveNow'
import { openArchiveNativeChatPanel } from '@/entrypoints/content/utils/nativeChat'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import { getCurrentLiveChatIframe, isIframeForCurrentVideo, isReplayChatIframe, YLC_CHAT_ATTR, YLC_OWNED_ATTR } from '../shared/iframeDom'

const MAX_ENSURE_DURATION_MS = 60000
const RETRY_INTERVAL_MS = 1000
const OPEN_CLICK_COOLDOWN_MS = 2000

const isFullscreenActive = () => document.fullscreenElement !== null

export const useEnsureArchiveNativeChatOpen = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return

    let isActive = true
    let timeoutId: number | null = null
    let startTime = 0
    let lastOpenClickedAt = 0
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
        stopEnsure()
        return
      }
      const currentVideoId = getCurrentYouTubeVideoId()

      const attachedIframe = useYTDLiveChatNoLsStore.getState().iframeElement
      const isBorrowedArchiveIframe =
        attachedIframe?.isConnected &&
        attachedIframe.getAttribute(YLC_CHAT_ATTR) === 'true' &&
        attachedIframe.getAttribute(YLC_OWNED_ATTR) !== 'true' &&
        isReplayChatIframe(attachedIframe) &&
        isIframeForCurrentVideo(attachedIframe, currentVideoId)
      if (isBorrowedArchiveIframe) {
        stopEnsure()
        return
      }

      const nativeIframe = getCurrentLiveChatIframe(currentVideoId) ?? useYTDLiveChatNoLsStore.getState().iframeElement
      const nativeIframeMatchesCurrent = !nativeIframe || isIframeForCurrentVideo(nativeIframe, currentVideoId)
      if (nativeIframeMatchesCurrent) {
        const nativeDocument = nativeIframe ? getLiveChatDocument(nativeIframe) : null
        if (nativeDocument && isLiveChatUnavailable(nativeDocument)) {
          stopEnsure()
          return
        }

        if (isArchiveChatPlayable(nativeIframe)) {
          stopEnsure()
          return
        }
      }

      if (hasTimedOut()) {
        stopEnsure()
        return
      }

      const canClickOpen = Date.now() - lastOpenClickedAt >= OPEN_CLICK_COOLDOWN_MS
      if (canClickOpen) {
        const opened = openArchiveNativeChatPanel()
        if (opened) {
          lastOpenClickedAt = Date.now()
          setIsAutoOpeningNativeChat(true)
        }
      }

      scheduleNext()
    }

    const startEnsure = () => {
      startTime = Date.now()
      lastOpenClickedAt = 0
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
