import { useEffect, useRef } from 'react'
import { resolveArchiveSource } from '@/entrypoints/content/chat/archive/resolveArchiveSource'
import { getLiveChatUrlForVideo, resolveLiveSource } from '@/entrypoints/content/chat/live/resolveLiveSource'
import {
  changeYLCStyle,
  isFallbackMembershipNameColor,
  resolveYLCMembershipNameColor,
} from '@/entrypoints/content/hooks/ylcStyleChange/ylcStyleApplier'
import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import iframeStyles from '../../features/YTDLiveChatIframe/styles'
import {
  attachIframeToContainer,
  captureAttachedBorrowedIframeDocumentStyle,
  detachAttachedIframe,
  resolveSourceIframe,
} from '../../features/YTDLiveChatIframe/utils/iframeAttachment'
import { createIframeInitializer } from '../../features/YTDLiveChatIframe/utils/iframeInitializer'
import { getIframeDocumentHref, getNonBlankIframeHref, isManagedLiveIframe, YLC_CHAT_ATTR } from '../shared/iframeDom'
import { getUnavailableCurrentLiveChatVideoId } from './liveChatAvailability'
import type { ChatMode } from './types'

const TRANSITION_CHECK_INTERVAL_MS = 1000
const BORROWED_AVAILABILITY_CHECK_INTERVAL_MS = 1000
const BORROWED_AVAILABILITY_MAX_ATTEMPTS = 30

export const useChatIframeLoader = (mode: ChatMode) => {
  const ref = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const lastAttachedPageVideoIdRef = useRef<string | null>(null)
  const setIsDisplay = useYTDLiveChatNoLsStore(state => state.setIsDisplay)
  const setIsIframeLoaded = useYTDLiveChatNoLsStore(state => state.setIsIframeLoaded)
  const setIFrameElement = useYTDLiveChatNoLsStore(state => state.setIFrameElement)
  const setUnavailableLiveChatVideoId = useYTDLiveChatNoLsStore(state => state.setUnavailableLiveChatVideoId)

  const setIsIframeLoadedRef = useRef(setIsIframeLoaded)
  const setIsDisplayRef = useRef(setIsDisplay)

  setIsIframeLoadedRef.current = setIsIframeLoaded
  setIsDisplayRef.current = setIsDisplay

  useEffect(() => {
    const updateAttachedVideoId = () => {
      lastAttachedPageVideoIdRef.current = getCurrentYouTubeVideoId()
    }

    const applyCurrentChatStyle = () => {
      const {
        fontSize,
        fontFamily,
        bgColor,
        blur,
        fontColor,
        membershipNameColor,
        userNameDisplay,
        space,
        userIconDisplay,
        superChatBarDisplay,
      } = useYTDLiveChatStore.getState()

      const resolvedMembershipNameColor = resolveYLCMembershipNameColor(membershipNameColor)
      if (isFallbackMembershipNameColor(membershipNameColor)) {
        useYTDLiveChatStore.setState({ membershipNameColor: resolvedMembershipNameColor })
      }

      changeYLCStyle({
        bgColor,
        blur,
        fontColor,
        membershipNameColor: resolvedMembershipNameColor,
        fontFamily,
        fontSize,
        space,
        userNameDisplay,
        userIconDisplay,
        superChatBarDisplay,
      })
    }

    setIFrameElement(null)
    setIsIframeLoadedRef.current(false)
    setIsDisplayRef.current(false)
    lastAttachedPageVideoIdRef.current = null

    const resetUnavailableLiveChatForNavigation = () => {
      const currentVideoId = getCurrentYouTubeVideoId()
      const unavailableVideoId = useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId
      if (unavailableVideoId && unavailableVideoId !== currentVideoId) {
        setUnavailableLiveChatVideoId(null)
      }
    }

    const isCurrentLiveChatTerminallyUnavailable = () => {
      if (mode !== 'live') return false
      const currentVideoId = getCurrentYouTubeVideoId()
      return Boolean(currentVideoId && useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId === currentVideoId)
    }

    const captureCurrentLiveChatUnavailable = (candidateIframe: HTMLIFrameElement | null = iframeRef.current) => {
      if (mode !== 'live') return false
      const unavailableVideoId = getUnavailableCurrentLiveChatVideoId(candidateIframe)
      if (!unavailableVideoId) return false
      setUnavailableLiveChatVideoId(unavailableVideoId)
      return true
    }

    resetUnavailableLiveChatForNavigation()

    const initializer = createIframeInitializer({
      iframeStyles,
      beforeApplyStyle: captureAttachedBorrowedIframeDocumentStyle,
      applyChatStyle: applyCurrentChatStyle,
      setIsIframeLoaded: setIsIframeLoadedRef.current,
    })

    let borrowedAvailabilityInterval: number | null = null
    let borrowedAvailabilityIframe: HTMLIFrameElement | null = null
    let borrowedAvailabilityAttempts = 0

    const stopBorrowedAvailabilityWatch = () => {
      if (borrowedAvailabilityInterval) {
        window.clearInterval(borrowedAvailabilityInterval)
        borrowedAvailabilityInterval = null
      }
      borrowedAvailabilityIframe = null
      borrowedAvailabilityAttempts = 0
    }

    const startBorrowedAvailabilityWatch = (iframe: HTMLIFrameElement, restart = false) => {
      if (mode !== 'live' || isManagedLiveIframe(iframe)) {
        stopBorrowedAvailabilityWatch()
        return
      }
      if (!restart && borrowedAvailabilityInterval && borrowedAvailabilityIframe === iframe) return

      stopBorrowedAvailabilityWatch()
      borrowedAvailabilityIframe = iframe
      borrowedAvailabilityInterval = window.setInterval(() => {
        if (iframeRef.current !== iframe || !iframe.isConnected) {
          stopBorrowedAvailabilityWatch()
          return
        }

        borrowedAvailabilityAttempts += 1
        if (captureCurrentLiveChatUnavailable(iframe)) {
          detachCurrentIframe()
          observer?.disconnect()
          stopRetry()
          return
        }

        if (borrowedAvailabilityAttempts >= BORROWED_AVAILABILITY_MAX_ATTEMPTS) {
          stopBorrowedAvailabilityWatch()
        }
      }, BORROWED_AVAILABILITY_CHECK_INTERVAL_MS)
    }

    function handleLoaded() {
      const iframe = iframeRef.current
      if (!iframe) return
      if (captureCurrentLiveChatUnavailable(iframe)) {
        detachCurrentIframe()
        observer?.disconnect()
        stopRetry()
        return
      }
      initializer.initialize(iframe)
      startBorrowedAvailabilityWatch(iframe, true)
    }

    function detachCurrentIframe(options?: { ensureNativeVisible?: boolean }) {
      const current = iframeRef.current
      if (!current) return

      stopBorrowedAvailabilityWatch()
      initializer.cleanup()
      current.removeEventListener('load', handleLoaded)
      detachAttachedIframe(current, ref.current, options)

      setIFrameElement(null)
      setIsIframeLoadedRef.current(false)
      iframeRef.current = null
    }

    const resolveSourceByMode = () => {
      if (mode === 'live') {
        return resolveLiveSource(getCurrentYouTubeVideoId(), iframeRef.current)
      }
      if (mode === 'archive') {
        return resolveArchiveSource(iframeRef.current)
      }
      return null
    }

    const finalizeAttachedSource = (iframe: HTMLIFrameElement) => {
      updateAttachedVideoId()
      if (getIframeDocumentHref(iframe) || isManagedLiveIframe(iframe)) {
        handleLoaded()
      } else {
        startBorrowedAvailabilityWatch(iframe)
      }
    }

    const syncChatSource = () => {
      if (isCurrentLiveChatTerminallyUnavailable() || captureCurrentLiveChatUnavailable()) {
        if (iframeRef.current) {
          detachCurrentIframe()
        }
        return false
      }

      const source = resolveSourceByMode()
      if (!source) {
        if (iframeRef.current) {
          detachCurrentIframe()
        }
        return false
      }

      const nextIframe = resolveSourceIframe(source, iframeRef.current)
      const href = getNonBlankIframeHref(nextIframe)
      if (!href) {
        return false
      }

      const container = ref.current
      if (!container) {
        return false
      }

      if (iframeRef.current === nextIframe) {
        if (!nextIframe.hasAttribute(YLC_CHAT_ATTR)) {
          attachIframeToContainer(container, nextIframe)
        }
        finalizeAttachedSource(nextIframe)
        return true
      }

      detachCurrentIframe()

      iframeRef.current = nextIframe
      setIFrameElement(nextIframe)

      attachIframeToContainer(container, nextIframe)
      nextIframe.addEventListener('load', handleLoaded)

      finalizeAttachedSource(nextIframe)

      return true
    }

    const shouldKeepWatchingForLiveNativeUrl = () => {
      if (mode !== 'live' || !isManagedLiveIframe(iframeRef.current)) return false
      const currentIframe = iframeRef.current
      if (!currentIframe) return false

      const currentVideoId = getCurrentYouTubeVideoId()
      if (!currentVideoId) return false

      return getNonBlankIframeHref(currentIframe) === getLiveChatUrlForVideo(currentVideoId)
    }

    const handleVideoTransition = () => {
      if (mode === 'none') return false

      const previousVideoId = lastAttachedPageVideoIdRef.current
      const currentVideoId = getCurrentYouTubeVideoId()
      if (!previousVideoId || !currentVideoId || previousVideoId === currentVideoId) {
        return false
      }

      lastAttachedPageVideoIdRef.current = currentVideoId

      detachCurrentIframe()
      syncOrWatch()

      return true
    }

    let observer: MutationObserver | null = null
    let retryInterval: number | null = null
    let retryStartedAt = 0
    const retryIntervalMs = 1000
    const retryMaxMs = 120000

    const stopRetry = () => {
      if (retryInterval) {
        window.clearInterval(retryInterval)
        retryInterval = null
      }
    }

    const startRetry = () => {
      if (retryInterval) return
      retryStartedAt = Date.now()
      retryInterval = window.setInterval(() => {
        if (syncChatSource()) {
          if (!shouldKeepWatchingForLiveNativeUrl()) {
            observer?.disconnect()
            stopRetry()
          }
          return
        }
        if (isCurrentLiveChatTerminallyUnavailable()) {
          observer?.disconnect()
          stopRetry()
          return
        }
        if (Date.now() - retryStartedAt >= retryMaxMs) {
          stopRetry()
        }
      }, retryIntervalMs)
    }

    const setupObserver = () => {
      observer?.disconnect()

      const getObserverTarget = () => {
        const liveChatFrame = document.querySelector('ytd-live-chat-frame')
        if (liveChatFrame) return liveChatFrame
        const chatContainer = document.querySelector('#chat-container')
        if (chatContainer) return chatContainer
        const secondary = document.querySelector('#secondary')
        if (secondary) return secondary
        return document.body
      }

      const target = getObserverTarget()
      if (!target) return

      observer = new MutationObserver(() => {
        if (syncChatSource()) {
          if (!shouldKeepWatchingForLiveNativeUrl()) {
            observer?.disconnect()
            stopRetry()
          }
          return
        }
        if (isCurrentLiveChatTerminallyUnavailable()) {
          observer?.disconnect()
          stopRetry()
        }
      })

      observer.observe(target, { childList: true, subtree: true })
    }

    const syncOrWatch = () => {
      if (syncChatSource() && !shouldKeepWatchingForLiveNativeUrl()) return
      if (isCurrentLiveChatTerminallyUnavailable()) {
        observer?.disconnect()
        stopRetry()
        return
      }
      setupObserver()
      startRetry()
    }

    syncOrWatch()

    const handleNavigate = () => {
      resetUnavailableLiveChatForNavigation()
      if (handleVideoTransition()) return

      // In live mode, skip teardown when the video hasn't changed to prevent
      // unnecessary iframe destruction during same-page SPA transitions.
      if (mode === 'live' && iframeRef.current) {
        const currentVideoId = getCurrentYouTubeVideoId()
        if (currentVideoId && lastAttachedPageVideoIdRef.current === currentVideoId) {
          syncChatSource()
          return
        }
      }

      detachCurrentIframe()
      syncOrWatch()
    }

    const transitionCheckInterval = window.setInterval(() => {
      if (!iframeRef.current) return
      handleVideoTransition()
    }, TRANSITION_CHECK_INTERVAL_MS)

    const handleFullscreenChange = () => {
      if (document.fullscreenElement !== null) return
      if (!iframeRef.current) return
      detachCurrentIframe({ ensureNativeVisible: mode === 'archive' })
    }

    document.addEventListener('yt-navigate-finish', handleNavigate)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('yt-navigate-finish', handleNavigate)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      observer?.disconnect()
      stopRetry()
      stopBorrowedAvailabilityWatch()
      window.clearInterval(transitionCheckInterval)
      detachCurrentIframe({
        ensureNativeVisible: document.fullscreenElement === null && mode === 'archive',
      })
    }
  }, [mode, setIFrameElement, setUnavailableLiveChatVideoId])

  return { ref }
}
