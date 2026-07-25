import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { useGlobalSettingStore } from '@/shared/stores'
import { useResolvedThemeMode } from '@/shared/theme'
import { useEnsureArchiveNativeChatOpen } from './chat/archive/useEnsureArchiveNativeChatOpen'
import { useYouTubeChatRuntime } from './chat/runtime/useYouTubeChatRuntime'
import { ensureChatIframeObservation } from './chat/shared/iframeDom'
import { YTDLiveChatSwitch } from './features/YTDLiveChatSwitch'
import { useContentRuntimeMessages } from './hooks/globalState/useContentRuntimeMessages'
import { useSettingsStorageSync } from './hooks/globalState/useSettingsStorageSync'
import { useYLCPortalTargets } from './hooks/useYLCPortalTargets'
import { useIsFullScreen } from './hooks/watchYouTubeUI/useIsFullscreen'
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
  useSettingsStorageSync()
  useYLCStyleApplication()
  const themeMode = useGlobalSettingStore(state => state.themeMode)
  const resolvedThemeMode = useResolvedThemeMode(themeMode)
  const ytdLiveChat = useGlobalSettingStore(state => state.ytdLiveChat)
  const isFullscreen = useIsFullScreen()
  const runtime = useYouTubeChatRuntime()
  const { mode } = runtime
  useEnsureArchiveNativeChatOpen(isFullscreen && ytdLiveChat && mode === 'archive')
  const portalEnabled = mode !== 'none' && runtime.canShowSwitch && !runtime.terminallyUnavailable
  const { overlayRoot, switchContainer } = useYLCPortalTargets({
    overlayEnabled: portalEnabled && isFullscreen,
    switchEnabled: portalEnabled && isFullscreen,
  })
  const shouldRenderSwitch = portalEnabled && switchContainer !== null
  const shouldRenderLiveChat = portalEnabled && isFullscreen && overlayRoot !== null

  useEffect(() => {
    if (!switchContainer) return
    switchContainer.style.display = shouldRenderSwitch ? 'inline-block' : 'none'
  }, [shouldRenderSwitch, switchContainer])

  const renderLiveChatPortal = () => {
    if (!shouldRenderLiveChat || !overlayRoot) return null
    return createPortal(
      <div
        data-ylc-theme={resolvedThemeMode}
        data-ylc-overlay-container
        className='fixed top-0 right-0 w-full h-full'
        style={OVERLAY_STYLE}
      >
        <YTDLiveChat
          isFullscreen={isFullscreen}
          videoId={runtime.videoId}
          mode={mode}
          sourceReady={runtime.sourceReady}
          runtimeRevision={runtime.revision}
        />
      </div>,
      overlayRoot,
    )
  }

  const renderSwitchButtonPortal = () => {
    if (!shouldRenderSwitch || !switchContainer) return null
    return createPortal(<YTDLiveChatSwitch />, switchContainer)
  }

  return (
    <>
      {renderLiveChatPortal()}
      {renderSwitchButtonPortal()}
    </>
  )
}
