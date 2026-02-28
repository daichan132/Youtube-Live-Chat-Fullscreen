import { useCallback } from 'react'
import { hasFullscreenChatSource } from '@/entrypoints/content/chat/runtime/hasFullscreenChatSource'
import { shouldShowOverlay } from '@/entrypoints/content/chat/runtime/overlayVisibility'
import type { ChatMode } from '@/entrypoints/content/chat/runtime/types'
import { useCSSTransition } from '@/shared/hooks/useCSSTransition'
import { useGlobalSettingStore, useYTDLiveChatNoLsStore } from '@/shared/stores'
import { Draggable } from './features/Draggable'
import { YTDLiveChatIframe } from './features/YTDLiveChatIframe'
import { YTDLiveChatSetting } from './features/YTDLiveChatSetting'
import { useFullscreenChatLayoutFix } from './hooks/watchYouTubeUI/useFullscreenChatLayoutFix'
import { useIsShow } from './hooks/watchYouTubeUI/useIsShow'
import { useNativeChatAutoDisable } from './hooks/watchYouTubeUI/useNativeChatAutoDisable'
import { usePollingWithNavigate } from './hooks/watchYouTubeUI/usePollingWithNavigate'

const OVERLAY_TIMEOUT = { enter: 200, exit: 200 } as const
const OVERLAY_CLASS_NAMES = {
  enter: 'opacity-0',
  enterActive: 'transition-opacity opacity-100 duration-200',
  exitActive: 'transition-opacity opacity-0 duration-200',
} as const

type YTDLiveChatProps = {
  isFullscreen: boolean
  mode: ChatMode
}

export const YTDLiveChat = ({ isFullscreen, mode }: YTDLiveChatProps) => {
  const { isShow, isNativeChatUsable, isNativeChatExpanded } = useIsShow()
  const iframeElement = useYTDLiveChatNoLsStore(state => state.iframeElement)
  const ytdLiveChat = useGlobalSettingStore(state => state.ytdLiveChat)
  const setYTDLiveChat = useGlobalSettingStore(state => state.setYTDLiveChat)
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
  // Keep YouTube native layout untouched unless our fullscreen overlay is actually visible.
  useFullscreenChatLayoutFix(isFullscreen && isOverlayVisible && iframeElement !== null)

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
          <Draggable>
            <YTDLiveChatIframe mode={mode} />
          </Draggable>
        </div>
      )}
    </>
  )
}
