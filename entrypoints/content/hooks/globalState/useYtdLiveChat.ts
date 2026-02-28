import { useEffect } from 'react'
import { useMessage } from '@/shared/hooks/useMessage'
import { useGlobalSettingStore } from '@/shared/stores'

export const useYtdLiveChat = () => {
  const ytdLiveChat = useGlobalSettingStore(state => state.ytdLiveChat)
  const setYTDLiveChat = useGlobalSettingStore(state => state.setYTDLiveChat)
  const { message: ytdLiveChatMessage } = useMessage<{ message: 'ytdLiveChat'; ytdLiveChat: boolean }>()

  useEffect(() => {
    if (ytdLiveChatMessage?.message === 'ytdLiveChat') {
      setYTDLiveChat(ytdLiveChatMessage.ytdLiveChat)
    }
  }, [ytdLiveChatMessage, setYTDLiveChat])

  return [ytdLiveChat, setYTDLiveChat] as const
}
