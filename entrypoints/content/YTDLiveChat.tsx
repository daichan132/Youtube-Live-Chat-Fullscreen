import { shouldShowOverlay } from '@/entrypoints/content/chat/runtime/overlayVisibility'
import type { ChatMode } from '@/entrypoints/content/chat/runtime/types'
import { useCSSTransition } from '@/shared/hooks/useCSSTransition'
import { useGlobalSettingStore, useYTDLiveChatStore } from '@/shared/stores'
import { Draggable } from './features/Draggable'
import { YTDLiveChatIframe } from './features/YTDLiveChatIframe'
import { YTDLiveChatSetting } from './features/YTDLiveChatSetting'
import { useFullscreenChatLayoutFix } from './hooks/watchYouTubeUI/useFullscreenChatLayoutFix'
import { useNativeChatAutoDisable } from './hooks/watchYouTubeUI/useNativeChatAutoDisable'
import { useNativeChatState } from './hooks/watchYouTubeUI/useNativeChatState'

const OVERLAY_TIMEOUT = { enter: 200, exit: 200 } as const
const OVERLAY_CLASS_NAMES = {
  enter: 'opacity-0',
  enterActive: 'transition-opacity opacity-100 duration-200',
  exitActive: 'transition-opacity opacity-0 duration-200',
} as const

type YTDLiveChatProps = {
  isFullscreen: boolean
  mode: ChatMode
  sourceReady: boolean
}

export const YTDLiveChat = ({ isFullscreen, mode, sourceReady }: YTDLiveChatProps) => {
  const { isNativeChatUsable, isNativeChatExpanded } = useNativeChatState(isFullscreen)
  const ytdLiveChat = useGlobalSettingStore(state => state.ytdLiveChat)
  const alwaysOnDisplay = useYTDLiveChatStore(state => state.alwaysOnDisplay)
  const setYTDLiveChat = useGlobalSettingStore(state => state.setYTDLiveChat)
  const isNativeChatCurrentlyOpen = isNativeChatUsable || isNativeChatExpanded
  // Disable extension chat when user opens native chat, respecting their intent
  useNativeChatAutoDisable({
    enabled: ytdLiveChat && isFullscreen,
    nativeChatOpen: isNativeChatCurrentlyOpen,
    isFullscreen,
    setYTDLiveChat,
  })

  // In archive mode, wait until native replay chat is actually playable before
  // showing the fullscreen chat overlay.
  const isOverlayVisible = shouldShowOverlay({
    enabled: ytdLiveChat,
    sourceReady,
    isFullscreen,
    alwaysOnDisplay,
    nativeChatOpen: isNativeChatCurrentlyOpen,
  })
  // Keep YouTube native layout untouched unless our fullscreen overlay is actually visible.
  useFullscreenChatLayoutFix(isFullscreen && isOverlayVisible)

  const overlayTransition = useCSSTransition({
    in: isOverlayVisible,
    timeout: OVERLAY_TIMEOUT,
    classNames: OVERLAY_CLASS_NAMES,
    unmountOnExit: true,
  })

  return (
    <>
      <YTDLiveChatSetting />
      {overlayTransition.isMounted && (
        <div className={overlayTransition.className}>
          <Draggable initialDisplayOnMount={isFullscreen}>
            <YTDLiveChatIframe mode={mode} />
          </Draggable>
        </div>
      )}
    </>
  )
}
