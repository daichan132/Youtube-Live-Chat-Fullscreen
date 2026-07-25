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
import {
  getIframeDocumentHref,
  getNonBlankIframeHref,
  isIframeForCurrentVideo,
  isManagedLiveIframe,
  YLC_CHAT_ATTR,
} from '../shared/iframeDom'
import { getUnavailableCurrentLiveChatVideoId } from './liveChatAvailability'
import type { ChatMode } from './types'

const TRANSITION_CHECK_INTERVAL_MS = 1000
const ATTACHED_AVAILABILITY_CHECK_INTERVAL_MS = 1000
const ATTACHED_AVAILABILITY_MAX_ATTEMPTS = 30
const SOURCE_HANDOFF_LOADING_DELAY_MS = 500

type ChatAttachmentControllerOptions = {
  container: HTMLDivElement
  mode: ChatMode
}

export type ChatAttachmentController = {
  start: () => () => void
  reconcile: () => void
}

export const createChatAttachmentController = ({ container, mode }: ChatAttachmentControllerOptions): ChatAttachmentController => {
  let reconcileCurrent = () => {}

  const start = () => {
    const iframeRef = { current: null as HTMLIFrameElement | null }
    const lastAttachedPageVideoIdRef = { current: null as string | null }
    const { setIsDisplay, setIsIframeLoaded, setIFrameElement, setUnavailableLiveChatVideoId } = useYTDLiveChatNoLsStore.getState()
    const setIsIframeLoadedRef = { current: setIsIframeLoaded }
    const setIsDisplayRef = { current: setIsDisplay }

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

    let sourceHandoffLoadingTimer: number | null = null
    const clearSourceHandoffLoadingTimer = () => {
      if (sourceHandoffLoadingTimer === null) return
      window.clearTimeout(sourceHandoffLoadingTimer)
      sourceHandoffLoadingTimer = null
    }
    const updateIframeLoaded = (loaded: boolean) => {
      if (loaded) clearSourceHandoffLoadingTimer()
      setIsIframeLoadedRef.current(loaded)
    }

    const initializer = createIframeInitializer({
      iframeStyles,
      beforeApplyStyle: captureAttachedBorrowedIframeDocumentStyle,
      applyChatStyle: applyCurrentChatStyle,
      setIsIframeLoaded: updateIframeLoaded,
    })

    let attachedAvailabilityInterval: number | null = null
    let attachedAvailabilityIframe: HTMLIFrameElement | null = null
    let attachedAvailabilityAttempts = 0

    const stopAttachedAvailabilityWatch = () => {
      if (attachedAvailabilityInterval) {
        window.clearInterval(attachedAvailabilityInterval)
        attachedAvailabilityInterval = null
      }
      attachedAvailabilityIframe = null
      attachedAvailabilityAttempts = 0
    }

    const startAttachedAvailabilityWatch = (iframe: HTMLIFrameElement, restart = false) => {
      if (mode !== 'live') {
        stopAttachedAvailabilityWatch()
        return
      }
      if (!restart && attachedAvailabilityInterval && attachedAvailabilityIframe === iframe) return

      stopAttachedAvailabilityWatch()
      attachedAvailabilityIframe = iframe
      attachedAvailabilityInterval = window.setInterval(() => {
        if (iframeRef.current !== iframe || !iframe.isConnected) {
          stopAttachedAvailabilityWatch()
          return
        }

        attachedAvailabilityAttempts += 1
        if (captureCurrentLiveChatUnavailable(iframe)) {
          detachCurrentIframe()
          observer?.disconnect()
          stopRetry()
          return
        }

        if (attachedAvailabilityAttempts >= ATTACHED_AVAILABILITY_MAX_ATTEMPTS) {
          stopAttachedAvailabilityWatch()
        }
      }, ATTACHED_AVAILABILITY_CHECK_INTERVAL_MS)
    }

    function handleLoaded() {
      const iframe = iframeRef.current
      if (!iframe) return false
      if (captureCurrentLiveChatUnavailable(iframe)) {
        detachCurrentIframe()
        observer?.disconnect()
        stopRetry()
        return false
      }
      const initialized = initializer.initialize(iframe)
      startAttachedAvailabilityWatch(iframe, true)
      return initialized
    }

    function detachCurrentIframe(options?: { ensureNativeVisible?: boolean; preserveLoadedState?: boolean }) {
      const current = iframeRef.current
      if (!current) return

      stopAttachedAvailabilityWatch()
      clearSourceHandoffLoadingTimer()
      initializer.cleanup()
      current.removeEventListener('load', handleLoaded)
      detachAttachedIframe(current, container, options)

      setIFrameElement(null)
      if (!options?.preserveLoadedState) {
        setIsIframeLoadedRef.current(false)
      }
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
        return handleLoaded()
      }
      startAttachedAvailabilityWatch(iframe)
      return false
    }

    const syncChatSource = () => {
      if (isCurrentLiveChatTerminallyUnavailable() || captureCurrentLiveChatUnavailable()) {
        if (iframeRef.current) {
          detachCurrentIframe()
        }
        return false
      }

      const currentIframe = iframeRef.current
      if (
        mode === 'archive' &&
        currentIframe?.isConnected &&
        currentIframe.hasAttribute(YLC_CHAT_ATTR) &&
        isIframeForCurrentVideo(currentIframe, getCurrentYouTubeVideoId())
      ) {
        return true
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

      if (iframeRef.current === nextIframe) {
        if (!nextIframe.hasAttribute(YLC_CHAT_ATTR)) {
          attachIframeToContainer(container, nextIframe)
          finalizeAttachedSource(nextIframe)
        }
        return true
      }

      const preserveLoadedState = useYTDLiveChatNoLsStore.getState().isIframeLoaded
      detachCurrentIframe({ preserveLoadedState })

      iframeRef.current = nextIframe
      setIFrameElement(nextIframe)

      attachIframeToContainer(container, nextIframe)
      nextIframe.addEventListener('load', handleLoaded)

      const initialized = finalizeAttachedSource(nextIframe)
      if (preserveLoadedState && !initialized) {
        sourceHandoffLoadingTimer = window.setTimeout(() => {
          sourceHandoffLoadingTimer = null
          if (iframeRef.current === nextIframe) {
            setIsIframeLoadedRef.current(false)
          }
        }, SOURCE_HANDOFF_LOADING_DELAY_MS)
      }

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
        if (Date.now() - retryStartedAt >= retryMaxMs) {
          observer?.disconnect()
          stopRetry()
          return
        }
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

    reconcileCurrent = syncOrWatch
    reconcileCurrent()

    const handleNavigate = () => {
      resetUnavailableLiveChatForNavigation()
      if (handleVideoTransition()) return

      // In live mode, skip teardown when the video hasn't changed to prevent
      // unnecessary iframe destruction during same-page SPA transitions.
      if (mode === 'live' && iframeRef.current) {
        const currentVideoId = getCurrentYouTubeVideoId()
        if (currentVideoId && lastAttachedPageVideoIdRef.current === currentVideoId) {
          syncOrWatch()
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

    document.addEventListener('yt-navigate-finish', handleNavigate)

    return () => {
      reconcileCurrent = () => {}
      document.removeEventListener('yt-navigate-finish', handleNavigate)
      observer?.disconnect()
      stopRetry()
      stopAttachedAvailabilityWatch()
      clearSourceHandoffLoadingTimer()
      window.clearInterval(transitionCheckInterval)
      detachCurrentIframe({
        ensureNativeVisible: document.fullscreenElement === null && mode === 'archive',
      })
    }
  }

  return {
    start,
    reconcile: () => reconcileCurrent(),
  }
}
