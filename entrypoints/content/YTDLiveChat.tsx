import { useState } from 'react'
import { useGlobalSettingStore } from '@/shared/stores'
import { YTDLiveChatSetting } from './features/YTDLiveChatSetting'
import { useNativeChatAutoDisable } from './hooks/watchYouTubeUI/useNativeChatAutoDisable'
import { ChatViewport } from './overlay/ChatViewport'
import { OverlayFrame } from './overlay/OverlayFrame'
import { chatRuntime } from './runtime/ChatRuntime'

type YTDLiveChatProps = {
  loading: boolean
}

export const YTDLiveChat = ({ loading }: YTDLiveChatProps) => {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chatVisible, setChatVisible] = useState(true)
  const setYTDLiveChat = useGlobalSettingStore(state => state.setYTDLiveChat)

  useNativeChatAutoDisable({
    enabled: true,
    setYTDLiveChat,
  })

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
