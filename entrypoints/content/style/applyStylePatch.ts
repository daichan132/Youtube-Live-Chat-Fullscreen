import type { ChatProfile, RGBA } from '@/shared/settings/model'
import { type ChatStyleEnvironment, type ChatStylePatch, compileStylePatch } from './compileStylePatch'
import { ensureFontLoaded } from './fontLoader'

const SPONSOR_COLOR_PROPERTY = '--yt-live-chat-sponsor-color'

const parseCssColor = (value: string): RGBA | null => {
  const color = value.trim()
  const rgbaMatch = color.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*[,/]\s*(\d+(?:\.\d+)?%?))?\s*\)$/i,
  )
  if (rgbaMatch) {
    const alphaValue = rgbaMatch[4]
    const alpha = alphaValue?.endsWith('%') ? Number(alphaValue.slice(0, -1)) / 100 : Number(alphaValue ?? 1)
    return {
      r: Number(rgbaMatch[1]),
      g: Number(rgbaMatch[2]),
      b: Number(rgbaMatch[3]),
      a: alpha,
    }
  }

  const hexMatch = color.match(/^#([\da-f]{6})([\da-f]{2})?$/i)
  if (!hexMatch) return null

  const hex = hexMatch[1]
  if (!hex) return null
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: hexMatch[2] ? Number.parseInt(hexMatch[2], 16) / 255 : 1,
  }
}

export const readYouTubeMembershipDefaultColor = (document: Document): RGBA | null => {
  try {
    const inlineValue = document.documentElement.style.getPropertyValue(SPONSOR_COLOR_PROPERTY)
    const computedValue = document.defaultView?.getComputedStyle(document.documentElement).getPropertyValue(SPONSOR_COLOR_PROPERTY) ?? ''
    return parseCssColor(computedValue) ?? parseCssColor(inlineValue)
  } catch {
    return null
  }
}

const applyProperties = (style: CSSStyleDeclaration, properties: Readonly<Record<string, string>>) => {
  for (const [property, value] of Object.entries(properties)) {
    style.setProperty(property, value)
  }
}

export const applyStylePatch = (document: Document, patch: ChatStylePatch) => {
  applyProperties(document.documentElement.style, patch.documentProperties)
  if (document.body) {
    applyProperties(document.body.style, patch.bodyProperties)
  }
  ensureFontLoaded(document, patch.fontFamily)
}

export const applyChatProfileToDocument = (document: Document, profile: ChatProfile, environment: Partial<ChatStyleEnvironment> = {}) => {
  const patch = compileStylePatch(profile, {
    membershipDefaultColor: environment.membershipDefaultColor ?? readYouTubeMembershipDefaultColor(document),
    firefox: environment.firefox ?? import.meta.env.FIREFOX,
  })
  applyStylePatch(document, patch)
  return patch
}
