import { useCallback } from 'react'

import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'

export const useYLCReactionButtonDisplayChange = () => {
  const { setProperty } = useYLCStylePropertyChange()

  const changeReactionButtonDisplay = useCallback(
    (display: boolean) => {
      setProperty('--extension-reaction-button-display', display ? 'inline' : 'none')
    },
    [setProperty],
  )

  const changeDisplay = useCallback(
    (display: boolean) => {
      changeReactionButtonDisplay(display)
    },
    [changeReactionButtonDisplay],
  )

  return { changeDisplay }
}
