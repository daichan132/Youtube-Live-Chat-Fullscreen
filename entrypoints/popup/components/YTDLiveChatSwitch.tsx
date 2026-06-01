import { useCallback, useId } from 'react'

import { Switch } from '@/shared/components/Switch'
import { useGlobalSettingStore } from '@/shared/stores'
import { sendActiveTabMessage } from '../utils/sendActiveTabMessage'

export const YTDLiveChatSwitch = () => {
  const id = useId()
  const ytdLiveChat = useGlobalSettingStore(state => state.ytdLiveChat)
  const setYTDLiveChat = useGlobalSettingStore(state => state.setYTDLiveChat)
  const handleSwitchChange = useCallback(
    (checked: boolean) => {
      setYTDLiveChat(checked)
      sendActiveTabMessage({
        message: 'ytdLiveChat',
        ytdLiveChat: checked,
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
