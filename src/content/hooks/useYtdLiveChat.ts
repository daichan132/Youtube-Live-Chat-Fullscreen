import { useMessage } from '@/shared/hooks/useMessage'
import { useGlobalSettingStore } from '@/shared/stores'
import { useEffect, useState } from 'react'

export const useYtdLiveChat = () => {
  const [ytdLiveChat, setYTDLiveChat] = useState(useGlobalSettingStore.getState().ytdLiveChat || false)
  const { message: ytdLiveChatMessage } = useMessage<{ message: 'ytdLiveChat'; ytdLiveChat: boolean }>()

  useEffect(() => {
    if (ytdLiveChatMessage?.message === 'ytdLiveChat') {
      setYTDLiveChat(ytdLiveChatMessage.ytdLiveChat)
    }
  }, [ytdLiveChatMessage])

  return { ytdLiveChat }
}
