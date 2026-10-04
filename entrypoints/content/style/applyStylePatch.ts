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

type AppliedProperty = { requested: string; serialized: string; priority: string }
const appliedProperties = new WeakMap<CSSStyleDeclaration, Map<string, AppliedProperty>>()

const applyProperties = (style: CSSStyleDeclaration, properties: Readonly<Record<string, string>>) => {
  let applied = appliedProperties.get(style)
  if (!applied) {
    applied = new Map()
    appliedProperties.set(style, applied)
  }
  for (const [property, value] of Object.entries(properties)) {
    const currentValue = style.getPropertyValue(property)
    const currentPriority = style.getPropertyPriority(property)
    if (currentValue === value && currentPriority === '') continue
    // CSSOM may normalize values or ignore an unsupported alias. Compare the
    // actual declaration on every pass so external edits still get repaired.
    const previous = applied.get(property)
    if (previous?.requested === value && previous.serialized === currentValue && previous.priority === currentPriority) continue
    style.setProperty(property, value)
    applied.set(property, {
      requested: value,
      serialized: style.getPropertyValue(property),
      priority: style.getPropertyPriority(property),
    })
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
    membershipDefaultColor:
      profile.appearance.membershipNameColor.mode === 'youtube-default'
        ? (environment.membershipDefaultColor ?? readYouTubeMembershipDefaultColor(document))
        : null,
    firefox: environment.firefox ?? import.meta.env.FIREFOX,
  })
  applyStylePatch(document, patch)
  return patch
}
