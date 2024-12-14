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

  return (
    <>
      {ytdLiveChat &&
        isFullscreen &&
        (() => {
          const portalRoot = document.getElementById('movie_player')
          if (!portalRoot) return null
          return createPortal(
            <div className='extension-root-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec'>
              <YTDLiveChat />
            </div>,
            portalRoot,
          )
        })()}
      {isFullscreen &&
        (() => {
          const container = document.getElementById('movie_player')?.getElementsByClassName("ytp-right-controls")[0]
          if (!container) return null
          let portalRoot = document.getElementById("switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec");
          if (!portalRoot) {
            portalRoot = document.createElement('div');
            portalRoot.style.height = "100%";
            portalRoot.style.width = "54px";
            portalRoot.style.display = "inline-block"
            portalRoot.id = "switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec";
            container.insertBefore(portalRoot, container.firstChild);
          }
          return createPortal(
            <YTDLiveChatSwitch />,
            portalRoot,
          )
        })()}
    </>
  )
}
