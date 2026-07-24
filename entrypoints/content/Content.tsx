import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { useGlobalSettingStore, useYTDLiveChatStore } from '@/shared/stores'
import { useResolvedThemeMode } from '@/shared/theme'
import { useEnsureArchiveNativeChatOpen } from './chat/archive/useEnsureArchiveNativeChatOpen'
import { useChatAvailability } from './chat/runtime/useChatAvailability'
import { useChatMode } from './chat/runtime/useChatMode'
import { useCurrentVideoId } from './chat/runtime/useCurrentVideoId'
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
  const alwaysOnDisplay = useYTDLiveChatStore(state => state.alwaysOnDisplay)
  const isFullscreen = useIsFullScreen()
  const mode = useChatMode()
  const currentVideoId = useCurrentVideoId()
  useEnsureArchiveNativeChatOpen(isFullscreen && ytdLiveChat && mode === 'archive')
  const availability = useChatAvailability(mode, currentVideoId)
  const portalEnabled = mode !== 'none' && availability.canShowSwitch && !availability.terminallyUnavailable
  const { overlayRoot, switchContainer } = useYLCPortalTargets({
    overlayEnabled: portalEnabled && (isFullscreen || alwaysOnDisplay),
    switchEnabled: portalEnabled && isFullscreen,
  })
  const shouldRenderSwitch = portalEnabled && switchContainer !== null
  const shouldRenderLiveChat = portalEnabled && overlayRoot !== null

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
        <YTDLiveChat isFullscreen={isFullscreen} mode={mode} sourceReady={availability.sourceReady} />
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
