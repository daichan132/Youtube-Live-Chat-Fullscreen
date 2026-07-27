import { useAtomValue } from 'jotai'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { effectiveProfileAtom, themeModeAtom, ytdLiveChatEnabledAtom } from '@/shared/state'
import { useResolvedThemeMode } from '@/shared/theme'
import { YTDLiveChatSwitch } from './features/YTDLiveChatSwitch'
import { useContentRuntimeMessages } from './hooks/globalState/useContentRuntimeMessages'
import { chatRuntime } from './runtime/ChatRuntime'
import { useChatRuntime } from './runtime/useChatRuntime'
import { YTDLiveChat } from './YTDLiveChat'

const OVERLAY_STYLE = {
  pointerEvents: 'none',
  zIndex: CONTENT_UI_LAYER.overlay,
} as const

export const Content = () => {
  useContentRuntimeMessages()

  const themeMode = useAtomValue(themeModeAtom)
  const resolvedThemeMode = useResolvedThemeMode(themeMode)
  const enabled = useAtomValue(ytdLiveChatEnabledAtom)
  const effectiveProfile = useAtomValue(effectiveProfileAtom)
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
