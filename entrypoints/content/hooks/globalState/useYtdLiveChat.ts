import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useMessage } from '@/shared/hooks/useMessage'
import { useGlobalSettingStore } from '@/shared/stores'

export const useYtdLiveChat = () => {
  const { ytdLiveChat, setYTDLiveChat } = useGlobalSettingStore(
    useShallow(state => ({
      ytdLiveChat: state.ytdLiveChat,
      setYTDLiveChat: state.setYTDLiveChat,
    })),
  )
  const { message: ytdLiveChatMessage } = useMessage<{ message: 'ytdLiveChat'; ytdLiveChat: boolean }>()

  useEffect(() => {
    if (ytdLiveChatMessage?.message === 'ytdLiveChat') {
      setYTDLiveChat(ytdLiveChatMessage.ytdLiveChat)
    }
  }, [ytdLiveChatMessage, setYTDLiveChat])

  return [ytdLiveChat, setYTDLiveChat] as const
}
