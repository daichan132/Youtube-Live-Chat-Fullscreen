import { useEffect, useRef } from 'react'
import { CSSTransition } from 'react-transition-group'
import { useShallow } from 'zustand/shallow'
import { useGlobalSettingStore } from '@/shared/stores'
import { Draggable } from './features/Draggable'
import { YTDLiveChatIframe } from './features/YTDLiveChatIframe'
import { YTDLiveChatSetting } from './features/YTDLiveChatSetting'
import { useFullscreenChatLayoutFix } from './hooks/watchYouTubeUI/useFullscreenChatLayoutFix'
import { useIsFullScreen } from './hooks/watchYouTubeUI/useIsFullscreen'
import { useIsShow } from './hooks/watchYouTubeUI/useIsShow'

export const YTDLiveChat = () => {
  const { isShow, isNativeChatOpen, isNativeChatExpanded } = useIsShow()
  const { ytdLiveChat, setYTDLiveChat } = useGlobalSettingStore(
    useShallow(state => ({
      ytdLiveChat: state.ytdLiveChat,
      setYTDLiveChat: state.setYTDLiveChat,
    })),
  )
  const isFullscreen = useIsFullScreen()
  useFullscreenChatLayoutFix(isFullscreen && ytdLiveChat)
  const nodeRef = useRef(null)
  const prevNativeChatOpenRef = useRef<boolean | null>(null)

  useEffect(() => {
    const isNativeChatToggleButton = (element: HTMLElement) => {
      const button = element.closest('button')
      if (!button) return false
      if (button.closest('#switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec')) return false

      const label =
        `${button.getAttribute('aria-label') ?? ''} ${button.getAttribute('title') ?? ''} ${
          button.getAttribute('data-title-no-tooltip') ?? ''
        } ${button.getAttribute('data-tooltip-text') ?? ''}`.toLowerCase()
      const isChatLabel = label.includes('chat') || label.includes('チャット')
      if (!isChatLabel) return false

      const isPlayerControls = Boolean(button.closest('.ytp-right-controls'))
      const isToggleViewModel = Boolean(button.closest('toggle-button-view-model, button-view-model'))
      return isPlayerControls || isToggleViewModel
    }

    const handlePointerDown = (event: Event) => {
      if (!ytdLiveChat) return
      const target = event.target as HTMLElement | null
      if (!target) return

      const shadowHost = document.getElementById('shadow-root-live-chat')
      if (shadowHost?.shadowRoot?.contains(target)) return

      const nativeChatTrigger = target.closest(
        '#chat-container, ytd-live-chat-frame, ytd-live-chat-frame #show-hide-button, ytd-live-chat-frame #close-button, #show-hide-button, #close-button',
      )
      if (!nativeChatTrigger && !isNativeChatToggleButton(target)) return

      if (isNativeChatToggleButton(target)) {
        setYTDLiveChat(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [ytdLiveChat, setYTDLiveChat])

  useEffect(() => {
    const prev = prevNativeChatOpenRef.current
    prevNativeChatOpenRef.current = isNativeChatOpen || isNativeChatExpanded
    if (prev === null) return

    if (!prev && (isNativeChatOpen || isNativeChatExpanded) && ytdLiveChat) {
      setYTDLiveChat(false)
    }
  }, [isNativeChatOpen, isNativeChatExpanded, ytdLiveChat, setYTDLiveChat])

  return (
    <>
      <YTDLiveChatSetting />
      <CSSTransition
        nodeRef={nodeRef}
        in={isShow && ytdLiveChat}
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
