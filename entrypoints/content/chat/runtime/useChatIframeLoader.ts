import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { resolveArchiveSource } from '@/entrypoints/content/chat/archive/resolveArchiveSource'
import { resolveLiveSource } from '@/entrypoints/content/chat/live/resolveLiveSource'
import { useChangeYLCStyle } from '@/entrypoints/content/hooks/ylcStyleChange/useChangeYLCStyle'
import { getYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import iframeStyles from '../../features/YTDLiveChatIframe/styles/iframe.css?inline'
import {
  attachIframeToContainer,
  detachAttachedIframe,
  getIframeDocumentHref,
  getNonBlankIframeHref,
  isManagedLiveIframe,
  resolveSourceIframe,
} from '../../features/YTDLiveChatIframe/utils/iframeAttachment'
import { createIframeInitializer } from '../../features/YTDLiveChatIframe/utils/iframeInitializer'
import type { ChatMode, IframeLoadState } from './types'

const debugLog = (message: string, details?: Record<string, unknown>) => {
  if (!import.meta.env.DEV) return
  // biome-ignore lint/suspicious/noConsole: Intentional debug logging for troubleshooting
  console.debug(`[useChatIframeLoader] ${message}`, details ?? '')
}

const LOAD_STATE_ORDER: Record<IframeLoadState, number> = {
  idle: 0,
  attaching: 1,
  initializing: 2,
  ready: 3,
  error: 4,
}

const TRANSITION_CHECK_INTERVAL_MS = 1000

const getPageVideoIdFromUrl = () => {
  try {
    const url = new URL(window.location.href)
    const queryVideoId = url.searchParams.get('v')
    if (queryVideoId) return queryVideoId
    const livePathMatch = url.pathname.match(/\/live\/([a-zA-Z0-9_-]+)/)
    if (livePathMatch?.[1]) return livePathMatch[1]
  } catch {
    // Ignore invalid URL parsing and fall back to DOM-derived ID.
  }
  return null
}

const getCurrentPageVideoId = () => getPageVideoIdFromUrl() ?? getYouTubeVideoId()

const isArchiveMode = (mode: ChatMode) => mode === 'archive'

export const useChatIframeLoader = (mode: ChatMode) => {
  const ref = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const loadStateRef = useRef<IframeLoadState>('idle')
  const lastAttachedPageVideoIdRef = useRef<string | null>(null)
  const lastAttachedHrefRef = useRef<string>('')
  const pendingTransitionGuardRef = useRef(false)
  const { setIsDisplay, setIsIframeLoaded, setIFrameElement } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      setIsDisplay: state.setIsDisplay,
      setIsIframeLoaded: state.setIsIframeLoaded,
      setIFrameElement: state.setIFrameElement,
    })),
  )
  const changeYLCStyle = useChangeYLCStyle()

  const changeYLCStyleRef = useRef(changeYLCStyle)
  const setIsIframeLoadedRef = useRef(setIsIframeLoaded)
  const setIsDisplayRef = useRef(setIsDisplay)

  changeYLCStyleRef.current = changeYLCStyle
  setIsIframeLoadedRef.current = setIsIframeLoaded
  setIsDisplayRef.current = setIsDisplay

  useEffect(() => {
    const setLoadState = (nextState: IframeLoadState) => {
      const currentState = loadStateRef.current
      if (LOAD_STATE_ORDER[nextState] < LOAD_STATE_ORDER[currentState]) return
      if (currentState === nextState) return
      loadStateRef.current = nextState
      debugLog('load state transition', {
        from: currentState,
        to: nextState,
      })
    }

    const resetLoadState = () => {
      if (loadStateRef.current !== 'idle') {
        debugLog('load state reset', {
          from: loadStateRef.current,
          to: 'idle',
        })
      }
      loadStateRef.current = 'idle'
    }

    const clearTransitionGuard = (reason: string, details: Record<string, unknown> = {}) => {
      if (!pendingTransitionGuardRef.current) return
      pendingTransitionGuardRef.current = false
      debugLog('transition-guard cleared', {
        reason,
        ...details,
      })
    }

    const updateAttachedMetadata = (iframe: HTMLIFrameElement, href: string) => {
      lastAttachedPageVideoIdRef.current = getCurrentPageVideoId()
      lastAttachedHrefRef.current = href || getNonBlankIframeHref(iframe)
    }

    const applyCurrentChatStyle = () => {
      const {
        fontSize,
        fontFamily,
        bgColor,
        blur,
        fontColor,
        userNameDisplay,
        space,
        userIconDisplay,
        reactionButtonDisplay,
        superChatBarDisplay,
      } = useYTDLiveChatStore.getState()

      changeYLCStyleRef.current({
        bgColor,
        blur,
        fontColor,
        fontFamily,
        fontSize,
        space,
        userNameDisplay,
        userIconDisplay,
        reactionButtonDisplay,
        superChatBarDisplay,
      })
    }

    setIFrameElement(null)
    setIsIframeLoadedRef.current(false)
    setIsDisplayRef.current(false)
    resetLoadState()
    pendingTransitionGuardRef.current = false
    lastAttachedPageVideoIdRef.current = null
    lastAttachedHrefRef.current = ''

    const initializer = createIframeInitializer({
      iframeStyles,
      applyChatStyle: applyCurrentChatStyle,
      setIsIframeLoaded: setIsIframeLoadedRef.current,
      setIsDisplay: setIsDisplayRef.current,
      setLoadState,
      debugLog,
    })

    const handleLoaded = () => {
      const iframe = iframeRef.current
      if (!iframe) return
      debugLog('iframe load event', {
        src: iframe.getAttribute('src') ?? iframe.src ?? '',
        docHref: getIframeDocumentHref(iframe),
      })
      initializer.initialize(iframe)
    }

    const detachCurrentIframe = (options?: { ensureNativeVisible?: boolean }) => {
      const current = iframeRef.current
      if (!current) return

      debugLog('detach iframe', {
        src: current.getAttribute('src') ?? current.src ?? '',
        docHref: getIframeDocumentHref(current),
      })

      initializer.cleanup()
      current.removeEventListener('load', handleLoaded)
      detachAttachedIframe(current, ref.current, options)

      setIFrameElement(null)
      setIsIframeLoadedRef.current(false)
      iframeRef.current = null
      resetLoadState()
    }

    const resolveSourceByMode = () => {
      if (mode === 'live') {
        return resolveLiveSource(getCurrentPageVideoId(), iframeRef.current)
      }
      if (mode === 'archive') {
        return resolveArchiveSource(iframeRef.current, {
          allowBorrowedCurrent: !pendingTransitionGuardRef.current,
        })
      }
      return null
    }

    const syncChatSource = () => {
      const source = resolveSourceByMode()
      if (!source) {
        if (iframeRef.current) {
          debugLog('source lost, detaching iframe', {
            mode,
            managedLive: isManagedLiveIframe(iframeRef.current),
          })
          detachCurrentIframe()
        } else {
          debugLog('skip source (not resolved)', {
            mode,
            hasCurrentIframe: Boolean(iframeRef.current),
          })
        }
        return false
      }

      const nextIframe = resolveSourceIframe(source, iframeRef.current)
      const href = getNonBlankIframeHref(nextIframe)
      const previousAttachedHref = lastAttachedHrefRef.current
      const previousPageVideoId = lastAttachedPageVideoIdRef.current
      const currentPageVideoId = getCurrentPageVideoId()
      const hasPageVideoChanged = Boolean(previousPageVideoId && currentPageVideoId && previousPageVideoId !== currentPageVideoId)
      if (!href) {
        debugLog('skip source (iframe not ready)', {
          mode,
          sourceKind: source.kind,
          src: nextIframe.getAttribute('src') ?? nextIframe.src ?? '',
          docHref: getIframeDocumentHref(nextIframe),
        })
        return false
      }

      if (
        source.kind === 'archive_borrow' &&
        previousAttachedHref &&
        href === previousAttachedHref &&
        (pendingTransitionGuardRef.current || hasPageVideoChanged)
      ) {
        debugLog('stale source rejected', {
          mode,
          href,
          sourceKind: source.kind,
          pendingTransitionGuard: pendingTransitionGuardRef.current,
          previousPageVideoId,
          currentPageVideoId,
        })
        return false
      }

      const container = ref.current
      if (!container) {
        debugLog('skip source (container not ready)', {
          mode,
          sourceKind: source.kind,
          href,
        })
        return false
      }

      if (iframeRef.current === nextIframe) {
        if (!nextIframe.hasAttribute('data-ylc-chat')) {
          attachIframeToContainer(container, nextIframe)
        }
        updateAttachedMetadata(nextIframe, href)
        if (source.kind === 'live_direct') {
          clearTransitionGuard('live source attached', { href })
        } else if (href !== previousAttachedHref) {
          clearTransitionGuard('archive source changed', {
            fromHref: previousAttachedHref,
            toHref: href,
          })
        }
        debugLog('reuse attached iframe', {
          mode,
          sourceKind: source.kind,
          href,
        })
        if (getIframeDocumentHref(nextIframe) || isManagedLiveIframe(nextIframe)) {
          handleLoaded()
        }
        return true
      }

      detachCurrentIframe()

      setLoadState('attaching')
      iframeRef.current = nextIframe
      setIFrameElement(nextIframe)

      debugLog('attach iframe', {
        mode,
        sourceKind: source.kind,
        src: nextIframe.getAttribute('src') ?? nextIframe.src ?? '',
        docHref: getIframeDocumentHref(nextIframe),
      })

      attachIframeToContainer(container, nextIframe)
      nextIframe.addEventListener('load', handleLoaded)

      updateAttachedMetadata(nextIframe, href)
      if (source.kind === 'live_direct') {
        clearTransitionGuard('live source attached', { href })
      } else if (href !== previousAttachedHref) {
        clearTransitionGuard('archive source changed', {
          fromHref: previousAttachedHref,
          toHref: href,
        })
      }

      if (getIframeDocumentHref(nextIframe) || isManagedLiveIframe(nextIframe)) {
        handleLoaded()
      }

      return true
    }

    const handleVideoTransition = (trigger: 'yt-navigate-finish' | 'video-id-watch') => {
      if (!isArchiveMode(mode)) return false

      const previousVideoId = lastAttachedPageVideoIdRef.current
      const currentVideoId = getCurrentPageVideoId()
      if (!previousVideoId || !currentVideoId || previousVideoId === currentVideoId) {
        return false
      }

      const currentAttached = iframeRef.current
      if (currentAttached) {
        const currentHref =
          getNonBlankIframeHref(currentAttached) ||
          getIframeDocumentHref(currentAttached) ||
          currentAttached.getAttribute('src') ||
          currentAttached.src ||
          ''
        if (currentHref) {
          lastAttachedHrefRef.current = currentHref
        }
      }

      pendingTransitionGuardRef.current = true
      lastAttachedPageVideoIdRef.current = currentVideoId
      debugLog('transition-guard armed', {
        mode,
        fromVideoId: previousVideoId,
        toVideoId: currentVideoId,
        lastAttachedHref: lastAttachedHrefRef.current,
        trigger,
      })

      detachCurrentIframe()
      if (!syncChatSource()) {
        setupObserver()
        startRetry()
      }

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
          observer?.disconnect()
          stopRetry()
        }
      })

      observer.observe(target, { childList: true, subtree: true })
    }

    if (!syncChatSource()) {
      setupObserver()
      startRetry()
    }

    const handleNavigate = () => {
      if (handleVideoTransition('yt-navigate-finish')) return
      detachCurrentIframe()
      if (!syncChatSource()) {
        setupObserver()
        startRetry()
      }
    }

    const transitionCheckInterval = window.setInterval(() => {
      if (!iframeRef.current || !isArchiveMode(mode)) return
      handleVideoTransition('video-id-watch')
    }, TRANSITION_CHECK_INTERVAL_MS)

    const handleFullscreenChange = () => {
      if (document.fullscreenElement !== null) return
      if (!iframeRef.current) return
      debugLog('fullscreen exited, detaching current iframe')
      detachCurrentIframe({ ensureNativeVisible: mode === 'archive' })
    }

    document.addEventListener('yt-navigate-finish', handleNavigate)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('yt-navigate-finish', handleNavigate)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      observer?.disconnect()
      stopRetry()
      window.clearInterval(transitionCheckInterval)
      initializer.cleanup()
      detachCurrentIframe({
        ensureNativeVisible: document.fullscreenElement === null && mode === 'archive',
      })
    }
  }, [mode, setIFrameElement])

  return { ref }
}
