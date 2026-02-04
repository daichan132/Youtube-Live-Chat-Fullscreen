import { useRef } from 'react'
import { CSSTransition } from 'react-transition-group'
import { useShallow } from 'zustand/shallow'
import { useGlobalSettingStore } from '@/shared/stores'
import { Draggable } from './features/Draggable'
import { YTDLiveChatIframe } from './features/YTDLiveChatIframe'
import { YTDLiveChatSetting } from './features/YTDLiveChatSetting'
import { useFullscreenChatLayoutFix } from './hooks/watchYouTubeUI/useFullscreenChatLayoutFix'
import { useIsFullScreen } from './hooks/watchYouTubeUI/useIsFullscreen'
import { useIsShow } from './hooks/watchYouTubeUI/useIsShow'
import { useNativeChatAutoDisable } from './hooks/watchYouTubeUI/useNativeChatAutoDisable'

export const YTDLiveChat = () => {
  const { isShow, isNativeChatUsable, isNativeChatExpanded } = useIsShow()
  const { ytdLiveChat, setYTDLiveChat } = useGlobalSettingStore(
    useShallow(state => ({
      ytdLiveChat: state.ytdLiveChat,
      setYTDLiveChat: state.setYTDLiveChat,
    })),
  )
  const isFullscreen = useIsFullScreen()
  useFullscreenChatLayoutFix(isFullscreen && ytdLiveChat && isShow)
  const nodeRef = useRef(null)
  const isNativeChatCurrentlyOpen = isNativeChatUsable || isNativeChatExpanded
  // Disable extension chat when user opens native chat, respecting their intent
  useNativeChatAutoDisable({
    enabled: ytdLiveChat,
    nativeChatOpen: isNativeChatCurrentlyOpen,
    setYTDLiveChat,
  })

  // isNativeChatCurrentlyOpen is false during fullscreen (useNativeChatState returns false),
  // but needed to hide overlay when native chat is opened after exiting fullscreen
  const shouldShowOverlay = isShow && ytdLiveChat && !isNativeChatCurrentlyOpen

  return (
    <>
      <YTDLiveChatSetting />
      <CSSTransition
        nodeRef={nodeRef}
        in={shouldShowOverlay}
        timeout={500}
        classNames={{
          appear: 'opacity-0',
          appearActive: 'transition-opacity opacity-100 duration-200',
          enter: 'opacity-0',
          enterActive: 'transition-opacity opacity-100 duration-200',
          exitActive: 'transition-opacity opacity-0 duration-200',
        }}
        unmountOnExit
      >
        <div ref={nodeRef}>
          <Draggable>
            <YTDLiveChatIframe />
          </Draggable>
        </div>
      </CSSTransition>
    </>
  )
}
