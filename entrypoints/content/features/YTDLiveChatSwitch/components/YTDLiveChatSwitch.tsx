import { useCallback } from 'react'
import { IoChatboxSharp } from 'react-icons/io5'
import { useShallow } from 'zustand/shallow'
import { useGlobalSettingStore } from '@/shared/stores'

export const YTDLiveChatSwitch = () => {
  const { ytdLiveChat, setYTDLiveChat } = useGlobalSettingStore(
    useShallow(state => ({
      ytdLiveChat: state.ytdLiveChat,
      setYTDLiveChat: state.setYTDLiveChat,
    })),
  )
  const handleClick = useCallback(() => {
    const newYtdLiveChat = !ytdLiveChat
    setYTDLiveChat(newYtdLiveChat)
  }, [ytdLiveChat, setYTDLiveChat])

  return (
    <button
      type='button'
      className='ytp-button'
      style={{
        display: 'flex',
        alignItems: 'center',
        WebkitAlignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        position: 'relative',
        cursor: 'pointer',
        opacity: 0.9,
        transition: 'opacity .1s cubic-bezier(0, 0, 0.2, 1)',
      }}
      aria-pressed={ytdLiveChat}
      onClick={handleClick}
      onKeyUp={() => {}}
    >
      <IoChatboxSharp
        size={'50%'}
        style={{
          color: '#fff',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </button>
  )
}
