import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { useGlobalSettingStore } from '@/shared/stores'
import { useResolvedThemeMode } from '@/shared/theme'
import { YTDLiveChatSwitch } from './features/YTDLiveChatSwitch'
import { useContentRuntimeMessages } from './hooks/globalState/useContentRuntimeMessages'
import { useSettingsStorageSync } from './hooks/globalState/useSettingsStorageSync'
import { chatRuntime } from './runtime/ChatRuntime'
import { useChatRuntime } from './runtime/useChatRuntime'
import { useChatEditorStore } from './settings/ChatEditorStore'
import { YTDLiveChat } from './YTDLiveChat'

const OVERLAY_STYLE = {
  pointerEvents: 'none',
  zIndex: CONTENT_UI_LAYER.overlay,
} as const

export const Content = () => {
  useContentRuntimeMessages()
  useSettingsStorageSync()

  const themeMode = useGlobalSettingStore(state => state.themeMode)
  const resolvedThemeMode = useResolvedThemeMode(themeMode)
  const enabled = useGlobalSettingStore(state => state.ytdLiveChat)
  const profile = useChatSettingsStore(state => state.profile)
  const draftProfile = useChatEditorStore(state => state.draftProfile)
  const effectiveProfile = draftProfile ?? profile
  const runtimeView = useChatRuntime()

  useEffect(() => {
    chatRuntime.start()
    return () => chatRuntime.stop()
  }, [])

  useEffect(() => {
    chatRuntime.setEnabled(enabled)
  }, [enabled])

  useEffect(() => {
    chatRuntime.setProfile(effectiveProfile)
  }, [effectiveProfile])

  const liveChatPortal =
    runtimeView.showOverlay && runtimeView.overlayRoot
      ? createPortal(
          <div
            data-ylc-theme={resolvedThemeMode}
            data-ylc-overlay-container
            className='fixed top-0 right-0 w-full h-full'
            style={OVERLAY_STYLE}
          >
            <YTDLiveChat loading={runtimeView.loading} />
          </div>,
          runtimeView.overlayRoot,
        )
      : null

  const switchPortal =
    runtimeView.showSwitch && runtimeView.switchContainer ? createPortal(<YTDLiveChatSwitch />, runtimeView.switchContainer) : null

  return (
    <>
      {liveChatPortal}
      {switchPortal}
    </>
  )
}
