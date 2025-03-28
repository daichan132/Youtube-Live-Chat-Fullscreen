import { useCallback } from 'react'

import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'

export const useYLCUserIconDisplayChange = () => {
  const { setProperty } = useYLCStylePropertyChange()

  const changeUserIconDisplay = useCallback(
    (display: boolean) => {
      setProperty('--extension-user-icon-display', display ? 'inline' : 'none')
    },
    [setProperty],
  )

  const changeDisplay = useCallback(
    (display: boolean) => {
      changeUserIconDisplay(display)
    },
    [changeUserIconDisplay],
  )

  return { changeDisplay }
}
