import { useCallback } from 'react'

import { useYTDLiveChatNoLsStore } from '@/shared/stores'

export const useYLCFontFamilyChange = () => {
  const importFont = useCallback((fontFamily: string) => {
    const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement
    if (!iframeElement?.contentWindow) return
    const fontUrl = `@import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@400;500&display=swap');`
    const existingStyleElement = iframeElement?.contentWindow.document.head.querySelector('#custom-font-style')
    if (existingStyleElement) {
      existingStyleElement.textContent = fontUrl
    } else {
      const styleElement = document.createElement('style')
      styleElement.id = 'custom-font-style'
      styleElement.textContent = fontUrl
      iframeElement?.contentWindow.document.head.appendChild(styleElement)
    }
  }, [])

  const changeIframeFontFamily = useCallback((fontFamily: string) => {
    const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement
    if (!iframeElement?.contentDocument) return
    iframeElement?.contentDocument?.documentElement.style.setProperty('font-family', `${fontFamily}, Roboto, Arial, sans-serif`)
  }, [])

  const changeFontFamily = useCallback(
    (fontFamily: string) => {
      importFont(fontFamily)
      changeIframeFontFamily(fontFamily)
    },
    [importFont, changeIframeFontFamily],
  )

  return { changeFontFamily }
}
