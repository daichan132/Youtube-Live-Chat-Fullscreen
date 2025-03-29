import { useCallback } from 'react'

import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'

export const useYLCSuperChatBarDisplayChange = () => {
  const { setProperty } = useYLCStylePropertyChange()

  const changeSuperChatBarDisplay = useCallback(
    (display: boolean) => {
      setProperty('--extension-super-chat-bar-display', display ? 'block' : 'none')
    },
    [setProperty],
  )

  const changeDisplay = useCallback(
    (display: boolean) => {
      changeSuperChatBarDisplay(display)
    },
    [changeSuperChatBarDisplay],
  )

  return { changeDisplay }
}
