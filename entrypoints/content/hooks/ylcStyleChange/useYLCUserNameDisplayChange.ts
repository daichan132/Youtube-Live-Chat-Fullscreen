import { useCallback } from 'react'

import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'

export const useYLCUserNameDisplayChange = () => {
  const { setProperty } = useYLCStylePropertyChange()

  const changeUserNameDisplay = useCallback(
    (display: boolean) => {
      setProperty('--extension-user-name-display', display ? 'inline' : 'none')
    },
    [setProperty],
  )

  const changeDisplay = useCallback(
    (display: boolean) => {
      changeUserNameDisplay(display)
    },
    [changeUserNameDisplay],
  )

  return { changeDisplay }
}
