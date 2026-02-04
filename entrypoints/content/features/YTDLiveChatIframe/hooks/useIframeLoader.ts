// useIframeLoader.js
import { useCallback, useEffect, useRef } from 'react'
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
  const handleLoaded = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    applyInitialStyle(iframe, changeYLCStyle, setIsIframeLoaded, setIsDisplay)
  }, [changeYLCStyle, setIsIframeLoaded, setIsDisplay])

  useEffect(() => {
    const detachIframe = () => {
      const current = iframeRef.current
      if (!current) return
      current.removeEventListener('load', handleLoaded)
      restoreIframeToOriginal(current)
      setIFrameElement(null)
      setIsIframeLoaded(false)
      iframeRef.current = null
    }

    const attachIframe = (chatIframe: HTMLIFrameElement) => {
      if (iframeRef.current === chatIframe) return true
      if (iframeRef.current) detachIframe()

      iframeRef.current = chatIframe
      setIFrameElement(iframeRef.current)

      try {
        const href = iframeRef.current.contentDocument?.location?.href
        if (href && !href.includes('about:blank')) {
          iframeRef.current.src = href
        }
      } catch {
        // CORS restriction - use existing src
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
  }, [handleLoaded, setIFrameElement, setIsIframeLoaded])

  return { ref }
}
