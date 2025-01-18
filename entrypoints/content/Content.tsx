import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PublicPath } from 'wxt/browser'
import { YTDLiveChat } from './YTDLiveChat'
import { YTDLiveChatSwitch } from './features/YTDLiveChatSwitch'
import { useI18n } from './hooks/globalState/useI18n'
import { useYtdLiveChat } from './hooks/globalState/useYtdLiveChat'
import { useIsFullScreen } from './hooks/watchYouTubeUI/useIsFullscreen'

function createShadowRoot(): ShadowRoot | null {
  const player = document.getElementById('movie_player')
  if (!player) return null

  let host = document.getElementById('shadow-root-live-chat')
  if (!host) {
    host = document.createElement('div')
    host.id = 'shadow-root-live-chat'
    const root = host.attachShadow({ mode: 'open' })

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = browser.runtime.getURL('content-scripts/content.css' as PublicPath)
    root.appendChild(link)

    player.appendChild(host)
    return root
  }
  return host.shadowRoot ?? null
}

function removeShadowRoot(root: ShadowRoot | null) {
  if (!root) return
  const host = root.host
  if (host?.parentNode) {
    host.parentNode.removeChild(host)
  }
}

function createSwitchButtonContainer(): HTMLElement | null {
  const controls = document.getElementById('movie_player')?.getElementsByClassName('ytp-right-controls')[0]
  if (!controls) return null

  let container = document.getElementById('switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec')
  if (!container) {
    container = document.createElement('div')
    container.id = 'switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec'
    container.style.height = '100%'
    container.style.width = '54px'
    container.style.display = 'inline-block'
    container.style.verticalAlign = 'top'
    controls.prepend(container)
  }
  return container
}

function removeSwitchButtonContainer(container: HTMLElement | null) {
  if (!container) return
  if (container.parentNode) {
    container.parentNode.removeChild(container)
  }
}

export const Content = () => {
  useI18n()
  const [ytdLiveChat] = useYtdLiveChat()
  const isFullscreen = useIsFullScreen()

  // Use refs to store DOM elements
  const shadowRootRef = useRef<ShadowRoot | null>(null)
  const switchButtonRef = useRef<HTMLElement | null>(null)

  // A state flag to force a second render after elements are created
  const [portalsReady, setPortalsReady] = useState(false)

  // Create or remove DOM elements on isFullscreen change
  useEffect(() => {
    if (isFullscreen) {
      shadowRootRef.current = createShadowRoot()
      switchButtonRef.current = createSwitchButtonContainer()
      // Ensure these new references are used on the next render
      setPortalsReady(true)
    } else {
      removeShadowRoot(shadowRootRef.current)
      removeSwitchButtonContainer(switchButtonRef.current)
      shadowRootRef.current = null
      switchButtonRef.current = null
      setPortalsReady(false)
    }
  }, [isFullscreen])

  const renderLiveChatPortal = () => {
    if (!portalsReady || !ytdLiveChat || !shadowRootRef.current) return null
    return createPortal(
      <div className='fixed top-0 right-0 w-full h-full z-1000 pointer-events-none'>
        <YTDLiveChat />
      </div>,
      shadowRootRef.current,
    )
  }

  const renderSwitchButtonPortal = () => {
    if (!portalsReady || !switchButtonRef.current) return null
    return createPortal(<YTDLiveChatSwitch />, switchButtonRef.current)
  }

  return (
    <>
      {renderLiveChatPortal()}
      {renderSwitchButtonPortal()}
    </>
  )
}
