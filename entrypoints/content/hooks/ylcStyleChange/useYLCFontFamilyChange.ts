import { useCallback } from 'react'

import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'

export const useYLCFontFamilyChange = () => {
  const { getIframeWindow, setProperty } = useYLCStylePropertyChange()

  const importFont = useCallback(
    (fontFamily: string) => {
      const contentWindow = getIframeWindow()
      if (!contentWindow) return

      const fontUrl = `@import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@400;500&display=swap');`
      const existingStyleElement = contentWindow.document.head.querySelector('#custom-font-style')

      if (existingStyleElement) {
        existingStyleElement.textContent = fontUrl
      } else {
        const styleElement = document.createElement('style')
        styleElement.id = 'custom-font-style'
        styleElement.textContent = fontUrl
        contentWindow.document.head.appendChild(styleElement)
      }
    },
    [getIframeWindow],
  )

  const changeIframeFontFamily = useCallback(
    (fontFamily: string) => {
      setProperty('font-family', `${fontFamily}, Roboto, Arial, sans-serif`)
    },
    [setProperty],
  )

  const changeFontFamily = useCallback(
    (fontFamily: string) => {
      importFont(fontFamily)
      changeIframeFontFamily(fontFamily)
    },
    [importFont, changeIframeFontFamily],
  )

  return { changeFontFamily }
}
