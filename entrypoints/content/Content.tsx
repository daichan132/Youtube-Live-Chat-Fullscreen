import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { useGlobalSettingStore, useYTDLiveChatNoLsStore } from '@/shared/stores'
import { useResolvedThemeMode } from '@/shared/theme'
import { useEnsureArchiveNativeChatOpen } from './chat/archive/useEnsureArchiveNativeChatOpen'
import { canToggleFullscreenChat } from './chat/runtime/hasFullscreenChatSource'
import { getUnavailableCurrentLiveChatVideoId } from './chat/runtime/liveChatAvailability'
import { useChatMode } from './chat/runtime/useChatMode'
import { useCurrentVideoId } from './chat/runtime/useCurrentVideoId'
import { ensureChatIframeObservation } from './chat/shared/iframeDom'
import { YTDLiveChatSwitch } from './features/YTDLiveChatSwitch'
import { useContentRuntimeMessages } from './hooks/globalState/useContentRuntimeMessages'
import { useYLCPortalTargets } from './hooks/useYLCPortalTargets'
import { useIsFullScreen } from './hooks/watchYouTubeUI/useIsFullscreen'
import { usePollingWithNavigate } from './hooks/watchYouTubeUI/usePollingWithNavigate'
import { useYLCStyleApplication } from './hooks/ylcStyleChange/useYLCStyleApplication'
import { YTDLiveChat } from './YTDLiveChat'

const OVERLAY_STYLE = {
  pointerEvents: 'none',
  zIndex: CONTENT_UI_LAYER.overlay,
} as const

export const Content = () => {
  useEffect(() => {
    ensureChatIframeObservation()
  }, [])

  useContentRuntimeMessages()
  useYLCStyleApplication()
  const themeMode = useGlobalSettingStore(state => state.themeMode)
  const resolvedThemeMode = useResolvedThemeMode(themeMode)
  const ytdLiveChat = useGlobalSettingStore(state => state.ytdLiveChat)
  const unavailableLiveChatVideoId = useYTDLiveChatNoLsStore(state => state.unavailableLiveChatVideoId)
  const setUnavailableLiveChatVideoId = useYTDLiveChatNoLsStore(state => state.setUnavailableLiveChatVideoId)
  const isFullscreen = useIsFullScreen()
  const mode = useChatMode()
  const currentVideoId = useCurrentVideoId()
  useEnsureArchiveNativeChatOpen(isFullscreen && ytdLiveChat && mode === 'archive')
  // Archive availability can change from provisional true to unavailable after
  // native iframe hydration. Keep archive in continuous monitoring to avoid
  // latching an incorrect visible switch state.
  const shouldLatchSwitchOnSuccess = mode === 'live'
  const isCurrentLiveChatUnavailable = mode === 'live' && unavailableLiveChatVideoId === currentVideoId

  useEffect(() => {
    if (!currentVideoId || !unavailableLiveChatVideoId || unavailableLiveChatVideoId === currentVideoId) return
    setUnavailableLiveChatVideoId(null)
  }, [currentVideoId, setUnavailableLiveChatVideoId, unavailableLiveChatVideoId])

  const shouldStopLiveChatPolling = useCallback(() => {
    if (mode !== 'live' || !currentVideoId) return false
    if (useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId === currentVideoId) return true

    const unavailableVideoId = getUnavailableCurrentLiveChatVideoId()
    if (unavailableVideoId !== currentVideoId) return false

    setUnavailableLiveChatVideoId(currentVideoId)
    return true
  }, [currentVideoId, mode, setUnavailableLiveChatVideoId])
  const canToggleFullscreenChatResult = usePollingWithNavigate({
    checkFn: useCallback(
      () => (mode !== 'live' || unavailableLiveChatVideoId !== currentVideoId) && canToggleFullscreenChat(mode),
      [currentVideoId, mode, unavailableLiveChatVideoId],
    ),
    stopOnSuccess: shouldLatchSwitchOnSuccess,
    maxAttempts: Number.POSITIVE_INFINITY,
    intervalMs: 1000,
    stopWhen: shouldStopLiveChatPolling,
  })
  const canToggleFullscreenChatSwitch = !isCurrentLiveChatUnavailable && canToggleFullscreenChatResult
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
        className='fixed top-0 right-0 w-full h-full'
        style={OVERLAY_STYLE}
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
