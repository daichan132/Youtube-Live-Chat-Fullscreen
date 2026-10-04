import { useCallback, useRef, useState } from 'react'
import { useNativeChatAutoDisable } from './hooks/watchYouTubeUI/useNativeChatAutoDisable'
import { ChatViewport } from './overlay/ChatViewport'
import { OverlayFrame } from './overlay/OverlayFrame'
import { useChatRuntimeInstance } from './runtime/ChatRuntimeContext'
import { SettingsFrame } from './settings/SettingsFrame'

type YTDLiveChatProps = {
  loading: boolean
}

export const YTDLiveChat = ({ loading }: YTDLiveChatProps) => {
  const chatRuntime = useChatRuntimeInstance()
  const settingsTrigger = useRef<HTMLElement | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chatVisible, setChatVisible] = useState(true)
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  useNativeChatAutoDisable({ enabled: true })

  return (
    <>
      <SettingsFrame returnFocusTo={settingsTrigger.current} open={settingsOpen} onClose={closeSettings} runtime={chatRuntime} />
      <OverlayFrame
        initialDisplayOnMount
        ready={!loading}
        settingsOpen={settingsOpen}
        onOpenSettings={source => {
          settingsTrigger.current = source
          setSettingsOpen(true)
        }}
        onChatVisibilityChange={setChatVisible}
        onInteractionStateChange={chatRuntime.setOverlayInteraction}
      >
        <ChatViewport loading={loading} visible={chatVisible} />
      </OverlayFrame>
    </>
  )
}
