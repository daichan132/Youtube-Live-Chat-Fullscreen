import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useGlobalSettingStore } from '@/shared/stores'
import { useResolvedThemeMode } from '@/shared/theme'
import { useEnsureArchiveNativeChatOpen } from './chat/archive/useEnsureArchiveNativeChatOpen'
import { canToggleFullscreenChat } from './chat/runtime/hasFullscreenChatSource'
import { useChatMode } from './chat/runtime/useChatMode'
import { ensureChatIframeObservation } from './chat/shared/iframeDom'
import { YTDLiveChatSwitch } from './features/YTDLiveChatSwitch'
import { useContentRuntimeMessages } from './hooks/globalState/useContentRuntimeMessages'
import { useYLCPortalTargets } from './hooks/useYLCPortalTargets'
import { useIsFullScreen } from './hooks/watchYouTubeUI/useIsFullscreen'
import { usePollingWithNavigate } from './hooks/watchYouTubeUI/usePollingWithNavigate'
import { YTDLiveChat } from './YTDLiveChat'

export const Content = () => {
  useEffect(() => {
    ensureChatIframeObservation()
  }, [])

  useContentRuntimeMessages()
  const themeMode = useGlobalSettingStore(state => state.themeMode)
  const resolvedThemeMode = useResolvedThemeMode(themeMode)
  const ytdLiveChat = useGlobalSettingStore(state => state.ytdLiveChat)
  const isFullscreen = useIsFullScreen()
  const mode = useChatMode()
  useEnsureArchiveNativeChatOpen(isFullscreen && ytdLiveChat && mode === 'archive')
  // Archive availability can change from provisional true to unavailable after
  // native iframe hydration. Keep archive in continuous monitoring to avoid
  // latching an incorrect visible switch state.
  const shouldLatchSwitchOnSuccess = mode === 'live'
  const canToggleFullscreenChatSwitch = usePollingWithNavigate({
    checkFn: useCallback(() => canToggleFullscreenChat(mode), [mode]),
    stopOnSuccess: shouldLatchSwitchOnSuccess,
    maxAttempts: Number.POSITIVE_INFINITY,
    intervalMs: 1000,
  })
  const { portalsReady, shadowRoot, switchButtonContainer } = useYLCPortalTargets(isFullscreen)
  const shouldRenderSwitch = mode !== 'none' && canToggleFullscreenChatSwitch && portalsReady && Boolean(switchButtonContainer)
  const shouldRenderLiveChat = mode !== 'none' && canToggleFullscreenChatSwitch && portalsReady && Boolean(shadowRoot)

  useEffect(() => {
    if (!switchButtonContainer) return
    switchButtonContainer.style.display = shouldRenderSwitch ? 'inline-block' : 'none'
  }, [shouldRenderSwitch, switchButtonContainer])

  const renderLiveChatPortal = () => {
    if (!shouldRenderLiveChat || !shadowRoot) return null
    return createPortal(
      <div
        data-ylc-theme={resolvedThemeMode}
        data-ylc-overlay-container
        className='fixed top-0 right-0 w-full h-full z-1000'
        style={{ pointerEvents: 'none' }}
      >
        <YTDLiveChat isFullscreen={isFullscreen} mode={mode} />
      </div>,
      shadowRoot,
    )
  }

  const renderSwitchButtonPortal = () => {
    if (!shouldRenderSwitch || !switchButtonContainer) return null
    return createPortal(<YTDLiveChatSwitch />, switchButtonContainer)
  }

  return (
    <>
      {renderLiveChatPortal()}
      {renderSwitchButtonPortal()}
    </>
  )
}
