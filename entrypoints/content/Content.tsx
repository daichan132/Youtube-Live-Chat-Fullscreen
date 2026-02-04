import { createPortal } from 'react-dom'
import { YTDLiveChatSwitch } from './features/YTDLiveChatSwitch'
import { useI18n } from './hooks/globalState/useI18n'
import { useYtdLiveChat } from './hooks/globalState/useYtdLiveChat'
import { useYLCPortalTargets } from './hooks/useYLCPortalTargets'
import { useEnsureArchiveChatOpen } from './hooks/watchYouTubeUI/useEnsureArchiveChatOpen'
import { useHasPlayableLiveChat } from './hooks/watchYouTubeUI/useHasPlayableLiveChat'
import { useIsFullScreen } from './hooks/watchYouTubeUI/useIsFullscreen'
import { YTDLiveChat } from './YTDLiveChat'

export const Content = () => {
  useI18n()
  const [ytdLiveChat] = useYtdLiveChat()
  const isFullscreen = useIsFullScreen()
  const hasPlayableChat = useHasPlayableLiveChat()
  useEnsureArchiveChatOpen(isFullscreen && ytdLiveChat)
  const { portalsReady, shadowRoot, switchButtonContainer } = useYLCPortalTargets(isFullscreen && hasPlayableChat)

  const renderLiveChatPortal = () => {
    if (!portalsReady || !shadowRoot) return null
    return createPortal(
      <div className='fixed top-0 right-0 w-full h-full z-1000' style={{ pointerEvents: 'none' }}>
        <YTDLiveChat />
      </div>,
      shadowRoot,
    )
  }

  const renderSwitchButtonPortal = () => {
    if (!portalsReady || !switchButtonContainer) return null
    return createPortal(<YTDLiveChatSwitch />, switchButtonContainer)
  }

  return (
    <>
      {renderLiveChatPortal()}
      {renderSwitchButtonPortal()}
    </>
  )
}
