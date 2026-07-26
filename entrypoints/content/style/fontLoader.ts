import { toGoogleFontFamilyParam } from '@/shared/utils/fontFamilyFormat'
import { normalizeFontFamily } from '@/shared/utils/fontFamilyPolicy'

// This id is part of iframeAttachment's borrowed-document restore contract.
const CUSTOM_FONT_STYLE_ID = 'custom-font-style'
const loadedFontsByDocument = new WeakMap<Document, Set<string>>()

const getLoadedFonts = (document: Document) => {
  const existing = loadedFontsByDocument.get(document)
  if (existing) return existing

  const loadedFonts = new Set<string>()
  loadedFontsByDocument.set(document, loadedFonts)
  return loadedFonts
}

export const ensureFontLoaded = (document: Document, fontFamily: string | null, styleId = CUSTOM_FONT_STYLE_ID) => {
  const normalizedFontFamily = normalizeFontFamily(fontFamily ?? '')
  const existingStyleElement = document.head.querySelector<HTMLStyleElement>(`#${styleId}`)

  if (!normalizedFontFamily) {
    existingStyleElement?.remove()
    return
  }

  const loadedFonts = getLoadedFonts(document)
  if (loadedFonts.has(normalizedFontFamily) && existingStyleElement?.dataset.fontFamily === normalizedFontFamily) {
    return
  }

  const styleElement = existingStyleElement ?? document.createElement('style')
  styleElement.id = styleId
  styleElement.dataset.fontFamily = normalizedFontFamily
  styleElement.textContent = `@import url('https://fonts.googleapis.com/css2?family=${toGoogleFontFamilyParam(normalizedFontFamily)}&display=swap');`

  if (!existingStyleElement) {
    document.head.appendChild(styleElement)
  }
  loadedFonts.add(normalizedFontFamily)
}
