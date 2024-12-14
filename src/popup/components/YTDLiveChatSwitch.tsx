import React, { useCallback } from 'react'

import { useShallow } from 'zustand/react/shallow'

import { Switch } from '@/shared/components/Switch'
import { useGlobalSettingStore } from '@/shared/stores'

export const YTDLiveChatSwitch = () => {
  const { ytdLiveChat, setYTDLiveChat } = useGlobalSettingStore(
    useShallow(state => ({
      ytdLiveChat: state.ytdLiveChat,
      setYTDLiveChat: state.setYTDLiveChat,
    })),
  )
  const handleSwitchChange = useCallback((checked: boolean) => {
    setYTDLiveChat(checked)
    chrome.runtime.sendMessage({
      message: 'ytdLiveChat',
      ytdLiveChat: checked,
    })
  }, [setYTDLiveChat])

  return (
    <div
      style={{
        width: '50px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Switch
        checked={ytdLiveChat}
        id='ytd-live-chat-switch'
        onChange={handleSwitchChange}
      />
    </div>
  )
}
