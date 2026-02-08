import { useEffect, useRef } from 'react'
import '@/entrypoints/content'
import { useShallow } from 'zustand/react/shallow'
import { useChangeYLCStyle } from '@/entrypoints/content/hooks/ylcStyleChange/useChangeYLCStyle'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import iframeStyles from '../styles/iframe.css?inline'
import { type IframeLoadState, resolveChatSource } from '../utils/chatSourceResolver'
import {
  attachIframeToContainer,
  detachAttachedIframe,
  getIframeDocumentHref,
  getNonBlankIframeHref,
  isManagedLiveIframe,
  resolveSourceIframe,
} from '../utils/iframeAttachment'
import { createIframeInitializer } from '../utils/iframeInitializer'

const debugLog = (message: string, details?: Record<string, unknown>) => {
  if (!import.meta.env.DEV) return
  // biome-ignore lint/suspicious/noConsole: Intentional debug logging for troubleshooting
  console.debug(`[useIframeLoader] ${message}`, details ?? '')
}

const LOAD_STATE_ORDER: Record<IframeLoadState, number> = {
  idle: 0,
  attaching: 1,
  initializing: 2,
  ready: 3,
  error: 4,
}

export const useIframeLoader = () => {
  const ref = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const loadStateRef = useRef<IframeLoadState>('idle')
  const { setIsDisplay, setIsIframeLoaded, setIFrameElement } = useYTDLiveChatNoLsStore(
    useShallow(state => ({
      setIsDisplay: state.setIsDisplay,
      setIsIframeLoaded: state.setIsIframeLoaded,
      setIFrameElement: state.setIFrameElement,
    })),
  )
  const changeYLCStyle = useChangeYLCStyle()

  // Use refs to store callbacks to avoid dependency changes triggering effect re-runs
  const changeYLCStyleRef = useRef(changeYLCStyle)
  const setIsIframeLoadedRef = useRef(setIsIframeLoaded)
  const setIsDisplayRef = useRef(setIsDisplay)

  // Keep refs up to date
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

    // Reset stale state from previous sessions before resolving sources.
    setIFrameElement(null)
    setIsIframeLoadedRef.current(false)
    setIsDisplayRef.current(false)
    resetLoadState()

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

    const syncChatSource = () => {
      const source = resolveChatSource(iframeRef.current)
      if (!source) {
        if (iframeRef.current) {
          debugLog('source lost, detaching iframe', {
            managedLive: isManagedLiveIframe(iframeRef.current),
          })
          detachCurrentIframe()
        } else {
          debugLog('skip source (not resolved)', {
            hasCurrentIframe: Boolean(iframeRef.current),
          })
        }
        return false
      }

      const nextIframe = resolveSourceIframe(source, iframeRef.current)
      const href = getNonBlankIframeHref(nextIframe)
      if (!href) {
        debugLog('skip source (iframe not ready)', {
          sourceKind: source.kind,
          src: nextIframe.getAttribute('src') ?? nextIframe.src ?? '',
          docHref: getIframeDocumentHref(nextIframe),
        })
        return false
      }

      const container = ref.current
      if (!container) {
        debugLog('skip source (container not ready)', {
          sourceKind: source.kind,
          href,
        })
        return false
      }

      if (iframeRef.current === nextIframe) {
        if (!nextIframe.hasAttribute('data-ylc-chat')) {
          attachIframeToContainer(container, nextIframe)
        }
        debugLog('reuse attached iframe', {
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
        sourceKind: source.kind,
        src: nextIframe.getAttribute('src') ?? nextIframe.src ?? '',
        docHref: getIframeDocumentHref(nextIframe),
      })

      attachIframeToContainer(container, nextIframe)
      nextIframe.addEventListener('load', handleLoaded)

      // Managed live iframes can fire load before listener attachment; initialize fail-open eagerly.
      if (getIframeDocumentHref(nextIframe) || isManagedLiveIframe(nextIframe)) {
        handleLoaded()
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
      detachCurrentIframe()
      if (!syncChatSource()) {
        setupObserver()
        startRetry()
      }
    }

    const handleFullscreenChange = () => {
      if (document.fullscreenElement !== null) return
      if (!iframeRef.current) return
      debugLog('fullscreen exited, detaching current iframe')
      detachCurrentIframe({ ensureNativeVisible: true })
    }

    document.addEventListener('yt-navigate-finish', handleNavigate)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('yt-navigate-finish', handleNavigate)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      observer?.disconnect()
      stopRetry()
      initializer.cleanup()
      detachCurrentIframe({
        ensureNativeVisible: document.fullscreenElement === null,
      })
    }
    // Effect only needs to run once on mount - callbacks are accessed via stable refs.
  }, [setIFrameElement])

  return { ref }
}
