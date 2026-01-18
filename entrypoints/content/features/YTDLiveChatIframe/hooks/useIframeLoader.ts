// useIframeLoader.js
import { useCallback, useEffect, useRef } from 'react'
import '@/entrypoints/content'
import { useShallow } from 'zustand/react/shallow'
import { useChangeYLCStyle } from '@/entrypoints/content/hooks/ylcStyleChange/useChangeYLCStyle'
import { getYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
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
    if (!ref.current) return
    if (ref.current.querySelector('iframe')) return

    const isCancelled = false
    let retryId: number | null = null

    const resolveChatSrc = (chatIframe: HTMLIFrameElement | null, videoId: string | null) => {
      const chatSrc = chatIframe?.contentDocument?.location.href
      if (chatSrc && !chatSrc.includes('about:blank')) return chatSrc
      if (chatIframe?.src && !chatIframe.src.includes('about:blank')) return chatIframe.src
      if (videoId) return `https://www.youtube.com/live_chat?is_popout=1&v=${videoId}`
      return null
    }

    const tryAttachIframe = () => {
      if (isCancelled) return
      if (!ref.current) return

      const chatIframe: HTMLIFrameElement | null = document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame')
      const videoId = getYouTubeVideoId()
      if (!chatIframe && !videoId) return

      const resolvedSrc = resolveChatSrc(chatIframe, videoId)
      const existingIframe = ref.current.querySelector('iframe')
      if (existingIframe instanceof HTMLIFrameElement) {
        const existingSrc = existingIframe.getAttribute('src') ?? ''
        if (!resolvedSrc) return
        if (existingSrc === '' || existingSrc.includes('about:blank')) {
          existingIframe.src = resolvedSrc
        }
        existingIframe.dataset.ylcChat = 'true'
        existingIframe.style.width = '100%'
        existingIframe.style.height = '100%'
        existingIframe.removeEventListener('load', handleLoaded)
        existingIframe.addEventListener('load', handleLoaded)
        if (iframeRef.current !== existingIframe) {
          iframeRef.current = existingIframe
          setIFrameElement(existingIframe)
        }
        return
      }

      if (!resolvedSrc) return
      const overlayIframe = (chatIframe ? chatIframe.cloneNode(false) : document.createElement('iframe')) as HTMLIFrameElement
      overlayIframe.removeAttribute('id')
      overlayIframe.removeAttribute('name')
      overlayIframe.src = resolvedSrc
      overlayIframe.dataset.ylcChat = 'true'
      overlayIframe.style.width = '100%'
      overlayIframe.style.height = '100%'
      overlayIframe.addEventListener('load', handleLoaded)

      iframeRef.current = overlayIframe
      setIFrameElement(overlayIframe)
      ref.current.appendChild(overlayIframe)
      if (retryId !== null) {
        window.clearInterval(retryId)
        retryId = null
      }
    }

    tryAttachIframe()
    retryId = window.setInterval(tryAttachIframe, 500)
    return () => {
      if (retryId !== null) {
        window.clearInterval(retryId)
      }
      iframeRef.current?.removeEventListener('load', handleLoaded)
      setIFrameElement(null)
      setIsIframeLoaded(false)
      setIsDisplay(false)
      iframeRef.current?.remove()
      iframeRef.current = null
    }
  }, [handleLoaded, setIFrameElement, setIsIframeLoaded, setIsDisplay])

  return { ref }
}
