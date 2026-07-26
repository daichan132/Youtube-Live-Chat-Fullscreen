import { darkenRgbaColor } from '@/entrypoints/content/utils/darkenRgbaColor'
import type { ChatProfile, RGBA } from '@/shared/settings/model'
import { toQuotedFontFamily } from '@/shared/utils/fontFamilyFormat'
import {
  YLC_BACKDROP_FILTER_PROPERTY,
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
} from '../hooks/ylcStyleChange/ylcStyleConstants'

const FALLBACK_FONT_FAMILY = 'Roboto, Arial, sans-serif'

export type ChatStylePatch = {
  documentProperties: Record<string, string>
  bodyProperties: Record<string, string>
  fontFamily: string | null
}

export type ChatStyleEnvironment = {
  /**
   * The resolved YouTube sponsor color for the current iframe document.
   * `null` means YouTube has not exposed a parseable value yet, so the
   * extension deliberately leaves the semantic color unmodified.
   */
  membershipDefaultColor: RGBA | null
  firefox: boolean
}

const toRgbaString = (rgba: RGBA, alpha = rgba.a) => `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${alpha})`

const roundAlpha = (alpha: number) => Math.round(alpha * 1000) / 1000

const toElevatedMenuSurfaceColor = (rgba: RGBA) => toRgbaString(rgba, roundAlpha(rgba.a + (1 - rgba.a) * 0.28))

const toPanelSurfaceColor = (rgba: RGBA) => {
  if (rgba.a === 0) return toRgbaString(rgba, 0)
  return toRgbaString(rgba, roundAlpha(Math.max(0.08, rgba.a * 0.28)))
}

const toSubtleSurfaceColor = (rgba: RGBA) => toRgbaString(rgba, Math.max(0.08, rgba.a * 0.12))

const setProperties = (target: Record<string, string>, properties: readonly string[], value: string) => {
  for (const property of properties) {
    target[property] = value
  }
}

export const compileStylePatch = (profile: ChatProfile, environment: ChatStyleEnvironment): ChatStylePatch => {
  const { appearance } = profile
  const documentProperties: Record<string, string> = {}

  setProperties(documentProperties, YLC_BG_COLOR_PROPERTIES, 'transparent')
  for (const { property, amount } of YLC_BG_DARKEN_PROPERTIES) {
    documentProperties[property] = darkenRgbaColor(appearance.backgroundColor, amount)
  }
  setProperties(documentProperties, YLC_BG_TRANSPARENT_PROPERTIES, 'transparent')
  setProperties(documentProperties, YLC_BG_SURFACE_PROPERTIES, toElevatedMenuSurfaceColor(appearance.backgroundColor))
  documentProperties[YLC_PANEL_BACKGROUND_PROPERTY] = toPanelSurfaceColor(appearance.backgroundColor)

  const primaryFontColor = toRgbaString(appearance.fontColor)
  const secondaryFontColor = toRgbaString(appearance.fontColor, Math.max(0, appearance.fontColor.a - 0.4))
  setProperties(documentProperties, YLC_FONT_COLOR_PROPERTIES, primaryFontColor)
  setProperties(documentProperties, YLC_FONT_COLOR_LIGHT_PROPERTIES, secondaryFontColor)
  setProperties(documentProperties, YLC_FONT_COLOR_SURFACE_PROPERTIES, toSubtleSurfaceColor(appearance.fontColor))

  const membershipColor =
    appearance.membershipNameColor.mode === 'custom' ? appearance.membershipNameColor.value : environment.membershipDefaultColor
  documentProperties[YLC_MEMBERSHIP_NAME_COLOR_PROPERTY] = membershipColor
    ? toRgbaString(membershipColor)
    : 'var(--yt-live-chat-sponsor-color)'

  // Keep blur inside the iframe document on every browser. The Firefox
  // brightness regression came from blurring the parent-page background
  // layer, which is no longer part of this style path.
  const blurValue = appearance.blur > 0 ? `blur(${appearance.blur}px)` : 'none'
  documentProperties[YLC_BACKDROP_FILTER_PROPERTY] = blurValue
  documentProperties[YLC_FONT_SIZE_PROPERTY] = `${appearance.fontSize}px`
  documentProperties[YLC_SPACING_PROPERTY] = `${appearance.spacing}px`
  documentProperties[YLC_USER_NAME_DISPLAY_PROPERTY] = appearance.showUserName ? 'inline' : 'none'
  documentProperties[YLC_USER_ICON_DISPLAY_PROPERTY] = appearance.showUserIcon ? 'inline' : 'none'
  documentProperties[YLC_SUPER_CHAT_BAR_DISPLAY_PROPERTY] = appearance.showSuperChatBar ? 'block' : 'none'
  documentProperties['font-family'] = appearance.fontFamily
    ? `${toQuotedFontFamily(appearance.fontFamily)}, ${FALLBACK_FONT_FAMILY}`
    : FALLBACK_FONT_FAMILY

  return {
    documentProperties,
    // Apply backdrop blur inside the iframe document, never as `filter` on the
    // iframe host. Body transparency stays owned by frame.css, so a borrowed
    // iframe does not gain extra inline background styles that need restoring.
    bodyProperties: {
      'backdrop-filter': blurValue,
      '-webkit-backdrop-filter': blurValue,
    },
    fontFamily: appearance.fontFamily,
  }
}
