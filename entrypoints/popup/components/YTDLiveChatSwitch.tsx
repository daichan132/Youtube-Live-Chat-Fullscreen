import { useCallback, useId } from 'react'

import { Switch } from '@/shared/components/Switch'
import { useGlobalSettingStore } from '@/shared/stores'

export const YTDLiveChatSwitch = () => {
  const id = useId()
  const ytdLiveChat = useGlobalSettingStore(state => state.ytdLiveChat)
  const setYTDLiveChat = useGlobalSettingStore(state => state.setYTDLiveChat)
  const handleSwitchChange = useCallback(
    (checked: boolean) => {
      setYTDLiveChat(checked)
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              message: 'ytdLiveChat',
              ytdLiveChat: checked,
            },
            () => {
              void chrome.runtime.lastError
            },
          )
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
