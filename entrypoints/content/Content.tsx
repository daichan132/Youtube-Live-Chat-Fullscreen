import { createPortal } from 'react-dom'
import type { PublicPath } from 'wxt/browser'
import { YTDLiveChat } from './YTDLiveChat'
import { YTDLiveChatSwitch } from './features/YTDLiveChatSwitch'
import { useI18n } from './hooks/globalState/useI18n'
import { useYtdLiveChat } from './hooks/globalState/useYtdLiveChat'
import { useIsFullScreen } from './hooks/watchYouTubeUI/useIsFullscreen'

const initializeShadowHost = (portalRoot: HTMLElement | null): ShadowRoot | null => {
  if (!portalRoot) return null
  let shadowHost = document.getElementById('shadow-root-live-chat')
  if (!shadowHost) {
    shadowHost = document.createElement('div')
    shadowHost.id = 'shadow-root-live-chat'
    const shadowRoot = shadowHost.attachShadow({ mode: 'closed' })
    const style = document.createElement('link')
    style.rel = 'stylesheet'
    style.href = browser.runtime.getURL('content-scripts/content.css' as PublicPath)
    shadowRoot.appendChild(style)
    portalRoot.appendChild(shadowHost)
  }
  return shadowHost.shadowRoot
}

export const Content = () => {
  useI18n()
  const [ytdLiveChat] = useYtdLiveChat()
  const isFullscreen = useIsFullScreen()

  return (
    <>
      {ytdLiveChat &&
        isFullscreen &&
        (() => {
          const shadowRoot = initializeShadowHost(document.getElementById('movie_player'))
          if (!shadowRoot) return null
          return createPortal(
            <div className='fixed top-0 right-0 w-full h-full z-1000 pointer-events-none'>
              <YTDLiveChat />
            </div>,
            shadowRoot,
          )
        })()}
      {isFullscreen &&
        (() => {
          const container = document.getElementById('movie_player')?.getElementsByClassName('ytp-right-controls')[0]
          if (!container) return null
          let portalRoot = document.getElementById('switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec')
          if (!portalRoot) {
            portalRoot = document.createElement('div')
            portalRoot.style.height = '100%'
            portalRoot.style.width = '54px'
            portalRoot.style.display = 'inline-block'
            portalRoot.style.verticalAlign = 'top'
            portalRoot.id = 'switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec'
            container.prepend(portalRoot)
          }
          return createPortal(<YTDLiveChatSwitch />, portalRoot)
        })()}
    </>
  )
}
