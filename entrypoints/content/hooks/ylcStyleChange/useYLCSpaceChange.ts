import { useCallback } from 'react'

import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'

export const useYLCSpaceChange = () => {
  const { setProperty } = useYLCStylePropertyChange()

  const changeSpace = useCallback(
    (space: number) => {
      setProperty('--extension-yt-live-chat-spacing', `${space}px`)
    },
    [setProperty],
  )

  return { changeSpace }
}
