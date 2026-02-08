import { useRef } from 'react'
import { CSSTransition } from 'react-transition-group'
import { useShallow } from 'zustand/shallow'
import { useGlobalSettingStore, useYTDLiveChatNoLsStore } from '@/shared/stores'
import { Draggable } from './features/Draggable'
import { YTDLiveChatIframe } from './features/YTDLiveChatIframe'
import { YTDLiveChatSetting } from './features/YTDLiveChatSetting'
import { useFullscreenChatLayoutFix } from './hooks/watchYouTubeUI/useFullscreenChatLayoutFix'
import { useIsShow } from './hooks/watchYouTubeUI/useIsShow'
import { useNativeChatAutoDisable } from './hooks/watchYouTubeUI/useNativeChatAutoDisable'

type YTDLiveChatProps = {
  isFullscreen: boolean
}

export const YTDLiveChat = ({ isFullscreen }: YTDLiveChatProps) => {
  const { isShow, isNativeChatUsable, isNativeChatExpanded } = useIsShow()
  const isIframeLoaded = useYTDLiveChatNoLsStore(state => state.isIframeLoaded)
  const { ytdLiveChat, setYTDLiveChat } = useGlobalSettingStore(
    useShallow(state => ({
      ytdLiveChat: state.ytdLiveChat,
      setYTDLiveChat: state.setYTDLiveChat,
    })),
  )
  // Keep native chat layout intact until extension iframe is actually ready.
  // Archive replay can stay about:blank if we collapse the native container too early.
  useFullscreenChatLayoutFix(isFullscreen && ytdLiveChat && isIframeLoaded)
  const nodeRef = useRef(null)
  const isNativeChatCurrentlyOpen = isNativeChatUsable || isNativeChatExpanded
  // Disable extension chat when user opens native chat, respecting their intent
  useNativeChatAutoDisable({
    enabled: ytdLiveChat && !isFullscreen,
    nativeChatOpen: isNativeChatCurrentlyOpen,
    setYTDLiveChat,
  })

  // Archive flow may need native chat to be open while fullscreen chat is loading.
  const shouldShowOverlay = ytdLiveChat && (isFullscreen || (isShow && !isNativeChatCurrentlyOpen))

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
