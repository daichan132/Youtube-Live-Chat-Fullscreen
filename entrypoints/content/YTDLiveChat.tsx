import { useState } from 'react'
import { YTDLiveChatSetting } from './features/YTDLiveChatSetting'
import { useNativeChatAutoDisable } from './hooks/watchYouTubeUI/useNativeChatAutoDisable'
import { ChatViewport } from './overlay/ChatViewport'
import { OverlayFrame } from './overlay/OverlayFrame'
import { useChatRuntimeInstance } from './runtime/ChatRuntimeContext'

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
      <YTDLiveChatSetting open={settingsOpen} onOpenChange={setSettingsOpen} />
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
