// useIframeLoader.js
import { useEffect, useRef } from 'react'
import '@/entrypoints/content'
import { useShallow } from 'zustand/react/shallow'
import { useChangeYLCStyle } from '@/entrypoints/content/hooks/ylcStyleChange/useChangeYLCStyle'
import { getYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { getLiveChatIframe } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import iframeStyles from '../styles/iframe.css?inline'

type ChangeYLCStyle = ReturnType<typeof useChangeYLCStyle>

const findChatIframe = () => getLiveChatIframe()
const getIframeVideoId = (iframe: HTMLIFrameElement) => {
  try {
    const docHref = iframe.contentDocument?.location?.href ?? ''
    if (docHref) {
      const url = new URL(docHref, window.location.origin)
      const videoId = url.searchParams.get('v')
      if (videoId) return videoId
    }
  } catch {
    // Ignore CORS/DOM access errors and fall back to src
  }

  try {
    const src = iframe.src ?? ''
    if (!src) return null
    const url = new URL(src, window.location.origin)
    return url.searchParams.get('v')
  } catch {
    return null
  }
}

const isIframeForCurrentVideo = (iframe: HTMLIFrameElement) => {
  const currentVideoId = getYouTubeVideoId()
  if (!currentVideoId) return true
  const iframeVideoId = getIframeVideoId(iframe)
  if (!iframeVideoId) {
    const watchFlexy = document.querySelector('ytd-watch-flexy')
    const watchGrid = document.querySelector('ytd-watch-grid')
    return Boolean(
      watchFlexy?.hasAttribute('live-chat-present') ||
        watchFlexy?.hasAttribute('live-chat-present-and-expanded') ||
        watchGrid?.hasAttribute('live-chat-present') ||
        watchGrid?.hasAttribute('live-chat-present-and-expanded'),
    )
  }
  return iframeVideoId === currentVideoId
}

const attachIframeToContainer = (container: HTMLDivElement | null, iframe: HTMLIFrameElement) => {
  if (!container) return
  iframe.setAttribute('data-ylc-chat', 'true')
  container.appendChild(iframe)
  iframe.style.width = '100%'
  iframe.style.height = '100%'
}

const debugLog = (message: string, details?: Record<string, unknown>) => {
  if (!import.meta.env.DEV) return
  // biome-ignore lint/suspicious/noConsole: Intentional debug logging for troubleshooting
  console.debug(`[useIframeLoader] ${message}`, details ?? '')
}

const restoreIframeToOriginal = (iframe: HTMLIFrameElement | null) => {
  const ytdLiveChatFrame: HTMLElement | null = document.querySelector('ytd-live-chat-frame')
  if (!ytdLiveChatFrame || !iframe) return
  const firstChild = ytdLiveChatFrame.firstChild
  ytdLiveChatFrame.insertBefore(iframe, firstChild)
}

const applyInitialStyle = (
  iframe: HTMLIFrameElement,
  changeYLCStyle: ChangeYLCStyle,
  setIsIframeLoaded: (value: boolean) => void,
  setIsDisplay: (value: boolean) => void,
) => {
  const iframeDocument = iframe.contentDocument
  if (!iframeDocument) return

  const { head, body } = iframeDocument
  if (head) {
    const style = document.createElement('style')
    style.textContent = iframeStyles
    head.appendChild(style)
  }

  if (body) {
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
    body.classList.add('custom-yt-app-live-chat-extension')
    changeYLCStyle({
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
    setIsIframeLoaded(true)
    setIsDisplay(true)
  }
}

export const useIframeLoader = () => {
  const ref = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
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

  // Stable callback that won't change between renders
  const handleLoadedRef = useRef<() => void>(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    debugLog('iframe load event', {
      src: iframe.getAttribute('src') ?? iframe.src ?? '',
      docHref: iframe.contentDocument?.location?.href ?? '',
      videoId: getYouTubeVideoId(),
    })
    applyInitialStyle(iframe, changeYLCStyleRef.current, setIsIframeLoadedRef.current, setIsDisplayRef.current)
  })

  useEffect(() => {
    const handleLoaded = handleLoadedRef.current

    const detachIframe = () => {
      const current = iframeRef.current
      if (!current) return
      debugLog('detach iframe', {
        src: current.getAttribute('src') ?? current.src ?? '',
        docHref: current.contentDocument?.location?.href ?? '',
        videoId: getYouTubeVideoId(),
      })
      current.removeEventListener('load', handleLoaded)
      current.removeAttribute('data-ylc-chat')
      restoreIframeToOriginal(current)
      if (current.parentElement === ref.current) {
        ref.current?.removeChild(current)
      }
      setIFrameElement(null)
      setIsIframeLoadedRef.current(false)
      iframeRef.current = null
    }

    const attachIframe = (chatIframe: HTMLIFrameElement) => {
      // Guard: already attached to this exact iframe
      if (iframeRef.current === chatIframe) return true

      // Guard: different iframe - detach old one first
      if (iframeRef.current && iframeRef.current !== chatIframe) {
        detachIframe()
      }

      iframeRef.current = chatIframe
      setIFrameElement(iframeRef.current)
      debugLog('attach iframe', {
        src: chatIframe.getAttribute('src') ?? chatIframe.src ?? '',
        docHref: chatIframe.contentDocument?.location?.href ?? '',
        videoId: getYouTubeVideoId(),
      })

      try {
        const href = iframeRef.current.contentDocument?.location?.href
        if (href && !href.includes('about:blank')) {
          iframeRef.current.src = href
        }
      } catch (error) {
        // Expected: CORS restriction when accessing cross-origin iframe
        // Only log unexpected errors in development
        if (import.meta.env.DEV && !(error instanceof DOMException)) {
          // biome-ignore lint/suspicious/noConsole: Intentional debug logging for development troubleshooting
          console.error('[useIframeLoader] Unexpected error accessing iframe:', error)
        }
      }

      attachIframeToContainer(ref.current, chatIframe)
      chatIframe.addEventListener('load', handleLoaded)
      return true
    }

    const tryAttach = () => {
      const chatIframe = findChatIframe()
      if (!chatIframe) return false
      if (!isIframeForCurrentVideo(chatIframe)) {
        debugLog('skip iframe (not current video)', {
          src: chatIframe.getAttribute('src') ?? chatIframe.src ?? '',
          docHref: chatIframe.contentDocument?.location?.href ?? '',
          videoId: getYouTubeVideoId(),
        })
        return false
      }
      return attachIframe(chatIframe)
    }

    let observer: MutationObserver | null = null
    let retryInterval: number | null = null
    const retryIntervalMs = 1000
    const retryMaxMs = 30000
    const retryStartedAt = Date.now()

    const startRetry = () => {
      if (retryInterval) return
      retryInterval = window.setInterval(() => {
        if (tryAttach()) {
          if (retryInterval) window.clearInterval(retryInterval)
          retryInterval = null
          return
        }
        if (Date.now() - retryStartedAt >= retryMaxMs) {
          if (retryInterval) window.clearInterval(retryInterval)
          retryInterval = null
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
        if (tryAttach()) {
          observer?.disconnect()
          if (retryInterval) window.clearInterval(retryInterval)
          retryInterval = null
        }
      })
      observer.observe(target, { childList: true, subtree: true })
    }

    if (!tryAttach()) {
      setupObserver()
      startRetry()
    }

    const handleNavigate = () => {
      detachIframe()
      if (!tryAttach()) {
        setupObserver()
        startRetry()
      }
    }

    document.addEventListener('yt-navigate-finish', handleNavigate)
    return () => {
      document.removeEventListener('yt-navigate-finish', handleNavigate)
      observer?.disconnect()
      if (retryInterval) window.clearInterval(retryInterval)
      detachIframe()
    }
    // Effect only needs to run once on mount - callbacks are accessed via stable refs
  }, [setIFrameElement])

  return { ref }
}
