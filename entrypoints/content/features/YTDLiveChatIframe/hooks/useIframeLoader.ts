// useIframeLoader.js
import { useEffect, useRef } from 'react'
import '@/entrypoints/content'
import { useShallow } from 'zustand/react/shallow'
import { useChangeYLCStyle } from '@/entrypoints/content/hooks/ylcStyleChange/useChangeYLCStyle'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import iframeStyles from '../styles/iframe.css?inline'

type ChangeYLCStyle = ReturnType<typeof useChangeYLCStyle>

const findChatIframe = () => document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame') as HTMLIFrameElement | null

const attachIframeToContainer = (container: HTMLDivElement | null, iframe: HTMLIFrameElement) => {
  if (!container) return
  container.appendChild(iframe)
  iframe.style.width = '100%'
  iframe.style.height = '100%'
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
    applyInitialStyle(iframe, changeYLCStyleRef.current, setIsIframeLoadedRef.current, setIsDisplayRef.current)
  })

  useEffect(() => {
    const handleLoaded = handleLoadedRef.current

    const detachIframe = () => {
      const current = iframeRef.current
      if (!current) return
      current.removeEventListener('load', handleLoaded)
      restoreIframeToOriginal(current)
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
      return attachIframe(chatIframe)
    }

    let observer: MutationObserver | null = null
    if (!tryAttach()) {
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
      if (target) {
        observer = new MutationObserver(() => {
          if (tryAttach()) {
            observer?.disconnect()
          }
        })
        observer.observe(target, { childList: true, subtree: true })
      }
    }

    return () => {
      observer?.disconnect()
      detachIframe()
    }
    // Effect only needs to run once on mount - callbacks are accessed via stable refs
  }, [setIFrameElement])

  return { ref }
}
