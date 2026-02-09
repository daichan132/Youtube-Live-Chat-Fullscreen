import { useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useEnsureArchiveNativeChatOpen } from './chat/archive/useEnsureArchiveNativeChatOpen'
import { canToggleFullscreenChat } from './chat/runtime/hasFullscreenChatSource'
import { useChatMode } from './chat/runtime/useChatMode'
import { YTDLiveChatSwitch } from './features/YTDLiveChatSwitch'
import { useI18n } from './hooks/globalState/useI18n'
import { useYtdLiveChat } from './hooks/globalState/useYtdLiveChat'
import { useYLCPortalTargets } from './hooks/useYLCPortalTargets'
import { useIsFullScreen } from './hooks/watchYouTubeUI/useIsFullscreen'
import { usePollingWithNavigate } from './hooks/watchYouTubeUI/usePollingWithNavigate'
import { YTDLiveChat } from './YTDLiveChat'

export const Content = () => {
  useI18n()
  const [ytdLiveChat] = useYtdLiveChat()
  const isFullscreen = useIsFullScreen()
  const mode = useChatMode()
  useEnsureArchiveNativeChatOpen(isFullscreen && ytdLiveChat && mode === 'archive')
  const canToggleFullscreenChatSwitch = usePollingWithNavigate({
    checkFn: useCallback(() => canToggleFullscreenChat(mode), [mode]),
    stopOnSuccess: false,
    maxAttempts: Number.POSITIVE_INFINITY,
    intervalMs: 1000,
  })
  const { portalsReady, shadowRoot, switchButtonContainer } = useYLCPortalTargets(isFullscreen)

  const renderLiveChatPortal = () => {
    if (!portalsReady || !shadowRoot) return null
    return createPortal(
      <div className='fixed top-0 right-0 w-full h-full z-1000' style={{ pointerEvents: 'none' }}>
        <YTDLiveChat isFullscreen={isFullscreen} mode={mode} />
      </div>,
      shadowRoot,
    )
  }

  const renderSwitchButtonPortal = () => {
    if (mode === 'none') return null
    if (!portalsReady || !switchButtonContainer) return null
    return createPortal(<YTDLiveChatSwitch disabled={!canToggleFullscreenChatSwitch} />, switchButtonContainer)
  }

  return (
    <>
      {renderLiveChatPortal()}
      {renderSwitchButtonPortal()}
    </>
  )
}
