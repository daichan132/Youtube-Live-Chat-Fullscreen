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
          const portalRoot = document.getElementById('movie_player')?.getElementsByClassName("ytp-right-controls")[0]
          if (!portalRoot) return null
          let switchButton = document.getElementById("switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec");
          if (!switchButton) {
            switchButton = document.createElement('button');
            switchButton.className = 'ytp-button';
            switchButton.id = "switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec";
            portalRoot.insertBefore(switchButton, portalRoot.firstChild);
          }
          return createPortal(
            <YTDLiveChatSwitch />,
            switchButton,
          )
        })()}
    </>
  )
}
