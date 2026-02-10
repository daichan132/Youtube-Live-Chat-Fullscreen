import { useCallback, useId } from 'react'

import { useShallow } from 'zustand/react/shallow'

import { Switch } from '@/shared/components/Switch'
import { useGlobalSettingStore } from '@/shared/stores'

export const YTDLiveChatSwitch = () => {
  const id = useId()
  const { ytdLiveChat, setYTDLiveChat } = useGlobalSettingStore(
    useShallow(state => ({
      ytdLiveChat: state.ytdLiveChat,
      setYTDLiveChat: state.setYTDLiveChat,
    })),
  )
  const handleSwitchChange = useCallback(
    (checked: boolean) => {
      setYTDLiveChat(checked)
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            message: 'ytdLiveChat',
            ytdLiveChat: checked,
          })
        }
      })
    },
    [setYTDLiveChat],
  )

  return (
    <div className='ylc-action-fill ylc-action-inner'>
      <Switch checked={ytdLiveChat} id={id} onChange={handleSwitchChange} />
    </div>
  )
}
