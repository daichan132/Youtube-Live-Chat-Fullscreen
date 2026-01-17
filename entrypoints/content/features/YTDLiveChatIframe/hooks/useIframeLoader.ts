// useIframeLoader.js
import { useCallback, useEffect, useRef } from 'react'
import '@/entrypoints/content'
import { useShallow } from 'zustand/react/shallow'
import { useChangeYLCStyle } from '@/entrypoints/content/hooks/ylcStyleChange/useChangeYLCStyle'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import iframeStyles from '../styles/iframe.css?inline'

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
    const body = iframeRef.current?.contentDocument?.body
    const head = iframeRef.current?.contentDocument?.head
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
  }, [changeYLCStyle, setIsIframeLoaded, setIsDisplay])

  useEffect(() => {
    const chatIframe: HTMLIFrameElement | null = document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame')
    if (!chatIframe || !ref.current) return
    if (ref.current.querySelector('iframe')) return

    const overlayIframe = chatIframe.cloneNode(false) as HTMLIFrameElement
    overlayIframe.removeAttribute('id')
    overlayIframe.removeAttribute('name')
    const chatSrc = chatIframe.contentDocument?.location.href
    if (chatSrc && !chatSrc.includes('about:blank')) {
      overlayIframe.src = chatSrc
    } else if (chatIframe.src) {
      overlayIframe.src = chatIframe.src
    }

    iframeRef.current = overlayIframe
    setIFrameElement(overlayIframe)
    ref.current.appendChild(overlayIframe)
    overlayIframe.style.width = '100%'
    overlayIframe.style.height = '100%'
    overlayIframe.addEventListener('load', handleLoaded)
    return () => {
      overlayIframe.removeEventListener('load', handleLoaded)
      setIFrameElement(null)
      setIsIframeLoaded(false)
      setIsDisplay(false)
      iframeRef.current = null
      overlayIframe.remove()
    }
  }, [handleLoaded, setIFrameElement, setIsIframeLoaded, setIsDisplay])

  return { ref }
}
