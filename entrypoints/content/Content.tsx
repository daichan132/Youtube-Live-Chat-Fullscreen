import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { PublicPath } from 'wxt/browser'
import { YTDLiveChat } from './YTDLiveChat'
import { YTDLiveChatSwitch } from './features/YTDLiveChatSwitch'
import { useI18n } from './hooks/globalState/useI18n'
import { useYtdLiveChat } from './hooks/globalState/useYtdLiveChat'
import { useIsFullScreen } from './hooks/watchYouTubeUI/useIsFullscreen'

function createShadowRootIfNeeded(): ShadowRoot | null {
  const player = document.getElementById('movie_player')
  if (!player) return null

  let host = document.getElementById('shadow-root-live-chat')
  if (!host) {
    host = document.createElement('div')
    host.id = 'shadow-root-live-chat'
    const shadowRoot = host.attachShadow({ mode: 'open' })

    const linkEl = document.createElement('link')
    linkEl.rel = 'stylesheet'
    linkEl.href = browser.runtime.getURL('content-scripts/content.css' as PublicPath)
    shadowRoot.appendChild(linkEl)

    player.appendChild(host)
    return shadowRoot
  }
  return host.shadowRoot ?? null
}

function removeShadowRootIfNeeded(shadowRoot: ShadowRoot | null) {
  if (!shadowRoot) return
  const host = shadowRoot.host
  if (host && host.parentNode) {
    host.parentNode.removeChild(host)
  }
}

function createSwitchButtonContainerIfNeeded(): HTMLElement | null {
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

function removeSwitchButtonContainerIfNeeded(container: HTMLElement | null) {
  if (!container) return
  if (container.parentNode) {
    container.parentNode.removeChild(container)
  }
}

export const Content = () => {
  useI18n()
  const [ytdLiveChat] = useYtdLiveChat()
  const isFullscreen = useIsFullScreen()

  const shadowRoot = useMemo(() => createShadowRootIfNeeded(), [])
  const switchButtonContainer = useMemo(() => createSwitchButtonContainerIfNeeded(), [])

  useEffect(() => {
    return () => {
      removeShadowRootIfNeeded(shadowRoot)
      removeSwitchButtonContainerIfNeeded(switchButtonContainer)
    }
  }, [shadowRoot, switchButtonContainer])

  const renderLiveChatPortal = () => {
    if (!isFullscreen || !ytdLiveChat || !shadowRoot) return null
    return createPortal(
      <div className='fixed top-0 right-0 w-full h-full z-1000 pointer-events-none'>
        <YTDLiveChat />
      </div>,
      shadowRoot,
    )
  }

  const renderSwitchButtonPortal = () => {
    if (!isFullscreen || !switchButtonContainer) return null
    return createPortal(<YTDLiveChatSwitch />, switchButtonContainer)
  }

  return (
    <>
      {renderLiveChatPortal()}
      {renderSwitchButtonPortal()}
    </>
  )
}
