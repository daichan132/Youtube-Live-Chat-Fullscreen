import { darkenRgbaColor } from '@/entrypoints/content/utils/darkenRgbaColor'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import type { RGBColor, YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { DEFAULT_MEMBERSHIP_NAME_COLOR } from '@/shared/utils'
import { toGoogleFontFamilyParam, toQuotedFontFamily } from '@/shared/utils/fontFamilyFormat'
import { normalizeFontFamily } from '@/shared/utils/fontFamilyPolicy'
import {
  YLC_BG_COLOR_PROPERTIES,
  YLC_BG_DARKEN_PROPERTIES,
  YLC_BG_SURFACE_PROPERTIES,
  YLC_BG_TRANSPARENT_PROPERTIES,
  YLC_FONT_COLOR_LIGHT_PROPERTIES,
  YLC_FONT_COLOR_PROPERTIES,
  YLC_FONT_COLOR_SURFACE_PROPERTIES,
  YLC_FONT_SIZE_PROPERTY,
  YLC_MEMBERSHIP_NAME_COLOR_PROPERTY,
  YLC_PANEL_BACKGROUND_PROPERTY,
  YLC_SPACING_PROPERTY,
  YLC_SUPER_CHAT_BAR_DISPLAY_PROPERTY,
  YLC_USER_ICON_DISPLAY_PROPERTY,
  YLC_USER_NAME_DISPLAY_PROPERTY,
} from './ylcStyleConstants'

export type PropertyEntry = readonly [string, string]

const CUSTOM_FONT_STYLE_ID = 'custom-font-style'
const FALLBACK_FONT_FAMILY = 'Roboto, Arial, sans-serif'

const getConnectedYLCIframe = () => {
  const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement
  if (!iframeElement?.isConnected) return undefined
  return iframeElement
}

const getYLCIframeDocument = () => {
  const iframeElement = getConnectedYLCIframe()
  if (!iframeElement) return undefined

  try {
    return iframeElement.contentDocument ?? undefined
  } catch {
    return undefined
  }
}

export const getYLCIframeDocumentElement = () => getYLCIframeDocument()?.documentElement

export const setYLCStyleProperties = (properties: ReadonlyArray<PropertyEntry>) => {
  const iframeDocument = getYLCIframeDocumentElement()
  if (!iframeDocument) return

  for (const [property, value] of properties) {
    iframeDocument.style.setProperty(property, value)
  }
}

export const setYLCStyleProperty = (property: string, value: string) => {
  setYLCStyleProperties([[property, value]])
}

const toRgbaString = (rgba: RGBColor, alpha: number | undefined) => `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${alpha})`

const roundAlpha = (alpha: number) => Math.round(alpha * 1000) / 1000

const isSameColor = (a: RGBColor, b: RGBColor) => a.r === b.r && a.g === b.g && a.b === b.b && (a.a ?? 1) === (b.a ?? 1)

const parseCssColor = (value: string): RGBColor | undefined => {
  const color = value.trim()
  const rgbaMatch = color.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)$/i)
  if (rgbaMatch) {
    return {
      r: Number(rgbaMatch[1]),
      g: Number(rgbaMatch[2]),
      b: Number(rgbaMatch[3]),
      a: rgbaMatch[4] === undefined ? 1 : Number(rgbaMatch[4]),
    }
  }

  const hexMatch = color.match(/^#([\da-f]{6})$/i)
  if (!hexMatch) return undefined

  const hex = hexMatch[1]
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: 1,
  }
}

export const isFallbackMembershipNameColor = (rgba: RGBColor) => isSameColor(rgba, DEFAULT_MEMBERSHIP_NAME_COLOR)

export const getYLCStandardMembershipNameColor = (): RGBColor => {
  const iframeDocumentElement = getYLCIframeDocumentElement()
  const sponsorColor = iframeDocumentElement ? getComputedStyle(iframeDocumentElement).getPropertyValue('--yt-live-chat-sponsor-color') : ''

  return parseCssColor(sponsorColor) ?? { ...DEFAULT_MEMBERSHIP_NAME_COLOR }
}

export const resolveYLCMembershipNameColor = (rgba: RGBColor): RGBColor =>
  isFallbackMembershipNameColor(rgba) ? getYLCStandardMembershipNameColor() : rgba

const toElevatedSurfaceColor = (rgba: RGBColor) => {
  const alpha = rgba.a ?? 1
  return toRgbaString(rgba, roundAlpha(alpha + (1 - alpha) * 0.28))
}

const toOpaquePanelColor = (rgba: RGBColor) => {
  return toRgbaString(rgba, 1)
}

const toSubtleSurfaceColor = (rgba: RGBColor) => toRgbaString(rgba, Math.max(0.08, (rgba.a ?? 1) * 0.12))

export const changeYLCBgColor = (rgba: RGBColor) => {
  setYLCStyleProperties([
    ...YLC_BG_COLOR_PROPERTIES.map(property => [property, 'transparent'] as const),
    ...YLC_BG_DARKEN_PROPERTIES.map(({ property, amount }) => [property, darkenRgbaColor(rgba, amount)] as const),
    ...YLC_BG_TRANSPARENT_PROPERTIES.map(property => [property, 'transparent'] as const),
    ...YLC_BG_SURFACE_PROPERTIES.map(property => [property, toElevatedSurfaceColor(rgba)] as const),
    [YLC_PANEL_BACKGROUND_PROPERTY, toOpaquePanelColor(rgba)],
  ])
}

export const changeYLCFontColor = (rgba: RGBColor) => {
  const primary = toRgbaString(rgba, rgba.a)
  const secondaryAlpha = Math.max(0, (rgba.a ?? 0) - 0.4)
  const secondary = toRgbaString(rgba, secondaryAlpha)

  setYLCStyleProperties([
    ...YLC_FONT_COLOR_PROPERTIES.map(property => [property, primary] as const),
    ...YLC_FONT_COLOR_LIGHT_PROPERTIES.map(property => [property, secondary] as const),
    ...YLC_FONT_COLOR_SURFACE_PROPERTIES.map(property => [property, toSubtleSurfaceColor(rgba)] as const),
  ])
}

export const changeYLCMembershipNameColor = (rgba: RGBColor) => {
  const resolvedColor = resolveYLCMembershipNameColor(rgba)
  setYLCStyleProperty(YLC_MEMBERSHIP_NAME_COLOR_PROPERTY, toRgbaString(resolvedColor, resolvedColor.a))
}

export const changeYLCBlur = (_blur: number) => {
  const iframeElement = getConnectedYLCIframe()
  const iframeDocument = getYLCIframeDocument()
  const body = iframeDocument?.body
  if (!iframeElement) return

  body?.style.setProperty('backdrop-filter', 'none')
  body?.style.setProperty('-webkit-backdrop-filter', 'none')
  iframeElement.style.filter = 'none'
  iframeElement.style.setProperty('-webkit-filter', 'none')
}

const removeImportedFont = () => {
  const iframeDocument = getYLCIframeDocument()
  iframeDocument?.head.querySelector(`#${CUSTOM_FONT_STYLE_ID}`)?.remove()
}

const importFont = (fontFamily: string) => {
  const iframeDocument = getYLCIframeDocument()
  if (!iframeDocument) return

  try {
    const fontUrl = `@import url('https://fonts.googleapis.com/css2?family=${toGoogleFontFamilyParam(fontFamily)}&display=swap');`
    const existingStyleElement = iframeDocument.head.querySelector(`#${CUSTOM_FONT_STYLE_ID}`)

    if (existingStyleElement) {
      existingStyleElement.textContent = fontUrl
      return
    }

    const styleElement = iframeDocument.createElement('style')
    styleElement.id = CUSTOM_FONT_STYLE_ID
    styleElement.textContent = fontUrl
    iframeDocument.head.appendChild(styleElement)
  } catch (e) {
    console.warn('[YLC] Failed to load Google Font:', e)
  }
}

const changeIframeFontFamily = (fontFamily: string) => {
  if (!fontFamily) {
    setYLCStyleProperty('font-family', FALLBACK_FONT_FAMILY)
    return
  }

  setYLCStyleProperty('font-family', `${toQuotedFontFamily(fontFamily)}, ${FALLBACK_FONT_FAMILY}`)
}

export const changeYLCFontFamily = (fontFamily: string) => {
  const normalizedFontFamily = normalizeFontFamily(fontFamily)
  if (!normalizedFontFamily) {
    removeImportedFont()
    changeIframeFontFamily('')
    return
  }

  importFont(normalizedFontFamily)
  changeIframeFontFamily(normalizedFontFamily)
}

const setDisplayProperty = (property: string, display: boolean, visibleValue: 'inline' | 'block' = 'inline') => {
  setYLCStyleProperty(property, display ? visibleValue : 'none')
}

export const changeYLCStyle = (update: YLCStyleUpdateType) => {
  if (update.bgColor !== undefined) changeYLCBgColor(update.bgColor)
  if (update.blur !== undefined) changeYLCBlur(update.blur)
  if (update.fontColor !== undefined) changeYLCFontColor(update.fontColor)
  if (update.membershipNameColor !== undefined) changeYLCMembershipNameColor(update.membershipNameColor)
  if (update.fontFamily !== undefined) changeYLCFontFamily(update.fontFamily)
  if (update.fontSize !== undefined) setYLCStyleProperty(YLC_FONT_SIZE_PROPERTY, `${update.fontSize}px`)
  if (update.space !== undefined) setYLCStyleProperty(YLC_SPACING_PROPERTY, `${update.space}px`)
  if (update.userNameDisplay !== undefined) {
    setDisplayProperty(YLC_USER_NAME_DISPLAY_PROPERTY, update.userNameDisplay)
  }
  if (update.userIconDisplay !== undefined) {
    setDisplayProperty(YLC_USER_ICON_DISPLAY_PROPERTY, update.userIconDisplay)
  }
  if (update.superChatBarDisplay !== undefined) {
    setDisplayProperty(YLC_SUPER_CHAT_BAR_DISPLAY_PROPERTY, update.superChatBarDisplay, 'block')
  }
}
