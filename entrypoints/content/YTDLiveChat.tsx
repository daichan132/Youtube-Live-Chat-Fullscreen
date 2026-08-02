import { useState } from 'react'
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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chatVisible, setChatVisible] = useState(true)
  useNativeChatAutoDisable({ enabled: true })

  return (
    <>
      <SettingsFrame open={settingsOpen} onClose={() => setSettingsOpen(false)} runtime={chatRuntime} />
      <OverlayFrame
        initialDisplayOnMount
        ready={!loading}
        settingsOpen={settingsOpen}
        onOpenSettings={() => setSettingsOpen(true)}
        onChatVisibilityChange={setChatVisible}
        onInteractionStateChange={chatRuntime.setOverlayInteraction}
      >
        <ChatViewport loading={loading} visible={chatVisible} />
      </OverlayFrame>
    </>
  )
}
