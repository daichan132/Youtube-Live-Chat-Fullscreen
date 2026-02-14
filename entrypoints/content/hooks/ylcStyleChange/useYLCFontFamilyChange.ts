import { useCallback } from 'react'
import { normalizeFontFamily } from '@/shared/utils/fontFamilyPolicy'

import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'

const CUSTOM_FONT_STYLE_ID = 'custom-font-style'
const FALLBACK_FONT_FAMILY = 'Roboto, Arial, sans-serif'

const toGoogleFontFamilyParam = (fontFamily: string) => encodeURIComponent(fontFamily.trim()).replace(/%20/g, '+')
const toQuotedFontFamily = (fontFamily: string) => `"${fontFamily.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

export const useYLCFontFamilyChange = () => {
  const { getIframeWindow, setProperty } = useYLCStylePropertyChange()

  const removeImportedFont = useCallback(() => {
    const contentWindow = getIframeWindow()
    if (!contentWindow) return

    const existingStyleElement = contentWindow.document.head.querySelector(`#${CUSTOM_FONT_STYLE_ID}`)
    existingStyleElement?.remove()
  }, [getIframeWindow])

  const importFont = useCallback(
    (fontFamily: string) => {
      const contentWindow = getIframeWindow()
      if (!contentWindow) return

      try {
        const fontUrl = `@import url('https://fonts.googleapis.com/css2?family=${toGoogleFontFamilyParam(fontFamily)}&display=swap');`
        const existingStyleElement = contentWindow.document.head.querySelector(`#${CUSTOM_FONT_STYLE_ID}`)

        if (existingStyleElement) {
          existingStyleElement.textContent = fontUrl
        } else {
          const styleElement = contentWindow.document.createElement('style')
          styleElement.id = CUSTOM_FONT_STYLE_ID
          styleElement.textContent = fontUrl
          contentWindow.document.head.appendChild(styleElement)
        }
      } catch (e) {
        console.warn('[YLC] Failed to load Google Font:', e)
      }
    },
    [getIframeWindow],
  )

  const changeIframeFontFamily = useCallback(
    (fontFamily: string) => {
      if (!fontFamily) {
        setProperty('font-family', FALLBACK_FONT_FAMILY)
        return
      }
      setProperty('font-family', `${toQuotedFontFamily(fontFamily)}, ${FALLBACK_FONT_FAMILY}`)
    },
    [setProperty],
  )

  const changeFontFamily = useCallback(
    (fontFamily: string) => {
      const normalizedFontFamily = normalizeFontFamily(fontFamily)
      if (!normalizedFontFamily) {
        removeImportedFont()
        changeIframeFontFamily('')
        return
      }

      importFont(normalizedFontFamily)
      changeIframeFontFamily(normalizedFontFamily)
    },
    [changeIframeFontFamily, importFont, removeImportedFont],
  )

  return { changeFontFamily }
}
