import { useCallback, useRef } from 'react'
import { CSSTransition } from 'react-transition-group'
import { useShallow } from 'zustand/shallow'
import { hasFullscreenChatSource } from '@/entrypoints/content/chat/runtime/hasFullscreenChatSource'
import { shouldShowOverlay } from '@/entrypoints/content/chat/runtime/overlayVisibility'
import type { ChatMode } from '@/entrypoints/content/chat/runtime/types'
import { useGlobalSettingStore, useYTDLiveChatNoLsStore } from '@/shared/stores'
import { Draggable } from './features/Draggable'
import { YTDLiveChatIframe } from './features/YTDLiveChatIframe'
import { YTDLiveChatSetting } from './features/YTDLiveChatSetting'
import { useFullscreenChatLayoutFix } from './hooks/watchYouTubeUI/useFullscreenChatLayoutFix'
import { useIsShow } from './hooks/watchYouTubeUI/useIsShow'
import { useNativeChatAutoDisable } from './hooks/watchYouTubeUI/useNativeChatAutoDisable'
import { usePollingWithNavigate } from './hooks/watchYouTubeUI/usePollingWithNavigate'

type YTDLiveChatProps = {
  isFullscreen: boolean
  mode: ChatMode
}

export const YTDLiveChat = ({ isFullscreen, mode }: YTDLiveChatProps) => {
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
    enabled: ytdLiveChat,
    nativeChatOpen: isNativeChatCurrentlyOpen,
    isFullscreen,
    setYTDLiveChat,
  })

  const canAttachFullscreenChat = usePollingWithNavigate({
    checkFn: useCallback(() => hasFullscreenChatSource(mode), [mode]),
    // Keep polling until first success, then latch to avoid fullscreen overlay
    // remount loops when live/archive signals momentarily fluctuate.
    stopOnSuccess: true,
    maxAttempts: Number.POSITIVE_INFINITY,
    intervalMs: 1000,
  })

  // In archive mode, wait until native replay chat is actually playable before
  // showing the fullscreen chat overlay.
  const isOverlayVisible = shouldShowOverlay({
    userToggleEnabled: ytdLiveChat,
    isFullscreen,
    fullscreenSourceReady: canAttachFullscreenChat,
    inlineVisible: isShow,
    nativeChatOpenIntent: isNativeChatCurrentlyOpen,
  })

  return (
    <>
      <YTDLiveChatSetting />
      <CSSTransition
        nodeRef={nodeRef}
        in={isOverlayVisible}
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
            <YTDLiveChatIframe mode={mode} />
          </Draggable>
        </div>
      </CSSTransition>
    </>
  )
}
