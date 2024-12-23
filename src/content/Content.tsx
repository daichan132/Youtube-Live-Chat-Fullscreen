import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { YTDLiveChat } from './YTDLiveChat'
import { YTDLiveChatSwitch } from './features/YTDLiveChatSwitch'
import { useI18n } from './hooks/globalState/useI18n'
import { useYtdLiveChat } from './hooks/globalState/useYtdLiveChat'
import { useIsFullScreen } from './hooks/watchYouTubeUI/useIsFullscreen'

export const Content = () => {
  useI18n()
  const [ytdLiveChat] = useYtdLiveChat()
  const isFullscreen = useIsFullScreen()

  const [chatPortalRoot, setChatPortalRoot] = useState<HTMLElement | null>(null)
  const [switchPortalRoot, setSwitchPortalRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    let chatRoot = null

    if (ytdLiveChat && isFullscreen) {
      const portalRoot = document.getElementById('movie_player')
      if (portalRoot) {
        chatRoot = document.createElement('div')
        chatRoot.className = 'extension-root-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec'
        chatRoot.id = 'extension-root-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec'
        portalRoot.appendChild(chatRoot)
        setChatPortalRoot(chatRoot)
      }
    }

    return () => {
      if (chatRoot) {
        chatRoot.remove()
        setChatPortalRoot(null)
      }
    }
  }, [ytdLiveChat, isFullscreen])

  useEffect(() => {
    let switchRoot = null

    if (isFullscreen) {
      const container = document.getElementById('movie_player')?.getElementsByClassName("ytp-right-controls")[0]
      if (container) {
        switchRoot = document.createElement('div')
        switchRoot.style.height = "100%"
        switchRoot.style.width = "54px"
        switchRoot.style.display = "inline-block"
        switchRoot.id = "switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec"
        container.insertBefore(switchRoot, container.firstChild)
        setSwitchPortalRoot(switchRoot)
      }
    }

    return () => {
      if (switchRoot) {
        switchRoot.remove()
        setSwitchPortalRoot(null)
      }
    }
  }, [isFullscreen])

  return (
    <>
      {chatPortalRoot &&
        createPortal(
          <div className='extension-root-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec' id='extension-root-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec'>
            <YTDLiveChat />
          </div>,
          chatPortalRoot,
        )
      }
      {switchPortalRoot &&
        createPortal(
          <YTDLiveChatSwitch />,
          switchPortalRoot,
        )
      }
    </>
  )
}
