import { useCallback } from 'react'

import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'

type DisplayValue = 'inline' | 'block' | 'none'

export const useYLCDisplayChange = (property: string, visibleValue: DisplayValue = 'inline', hiddenValue: DisplayValue = 'none') => {
  const { setProperty } = useYLCStylePropertyChange()

  const changeDisplay = useCallback(
    (display: boolean) => {
      setProperty(property, display ? visibleValue : hiddenValue)
    },
    [setProperty, property, visibleValue, hiddenValue],
  )

  return { changeDisplay }
}
