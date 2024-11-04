import { useCallback } from 'react'

import { useYTDLiveChatNoLsStore } from '@/shared/stores'

export const useYLCSuperChatBarDisplayChange = () => {
  const changeSuperChatBarDisplay = useCallback((display: boolean) => {
    const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement
    const iframeDocument = iframeElement?.contentDocument?.documentElement
    if (!iframeDocument) return
    iframeDocument.style.setProperty('--extension-super-chat-bar-display', display ? 'block' : 'none')
  }, [])
  const changeDisplay = useCallback(
    (display: boolean) => {
      changeSuperChatBarDisplay(display)
    },
    [changeSuperChatBarDisplay],
  )
  return { changeDisplay }
}
