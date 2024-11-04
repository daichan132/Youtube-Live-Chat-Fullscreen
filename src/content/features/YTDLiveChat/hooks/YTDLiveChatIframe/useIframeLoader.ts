// useIframeLoader.js
import { useCallback, useEffect, useRef } from 'react'

import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/stores'
import iframeStyles from '../../styles/YTDLiveChatIframe/iframe.css?inline'

import { useChangeYLCStyle } from './useChangeYLCStyle'

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
    const chatIframe: HTMLIFrameElement | null = document.querySelector(
      'ytd-live-chat-frame iframe.ytd-live-chat-frame',
    )
    if (!chatIframe) return
    iframeRef.current = chatIframe
    setIFrameElement(iframeRef.current)
    if (
      iframeRef.current.contentDocument?.location.href &&
      !iframeRef.current.contentDocument?.location.href?.includes('about:blank')
    ) {
      iframeRef.current.src = iframeRef.current.contentDocument.location.href
    }
    ref.current?.appendChild(iframeRef.current)
    iframeRef.current.style.width = '100%'
    iframeRef.current.style.height = '100%'
    iframeRef.current.addEventListener('load', handleLoaded)
    return () => {
      iframeRef.current?.removeEventListener('load', handleLoaded)

      const ytdLiveChatFrame: HTMLElement | null = document.querySelector('ytd-live-chat-frame')
      if (!ytdLiveChatFrame || !iframeRef.current) return
      const firstChild = ytdLiveChatFrame.firstChild
      ytdLiveChatFrame.insertBefore(iframeRef.current, firstChild)

      setIFrameElement(null)
      setIsIframeLoaded(false)
      iframeRef.current = null
    }
  }, [handleLoaded, setIFrameElement, setIsIframeLoaded])

  return { ref }
}
