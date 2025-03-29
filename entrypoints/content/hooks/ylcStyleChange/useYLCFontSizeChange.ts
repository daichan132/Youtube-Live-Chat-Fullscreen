import { useCallback } from 'react'

import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'

export const useYLCFontSizeChange = () => {
  const { setProperty } = useYLCStylePropertyChange()

  const changeFontSize = useCallback(
    (fontSize: number) => {
      setProperty('--extension-yt-live-chat-font-size', `${fontSize}px`)
    },
    [setProperty],
  )

  return { changeFontSize }
}
