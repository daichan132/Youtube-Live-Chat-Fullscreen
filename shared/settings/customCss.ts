import type { ChatCssCustomization, ChatProfile, ChatSettings } from './model'

export const MAX_CUSTOM_CSS_BYTES = 64 * 1024

export const DEFAULT_CUSTOM_CSS: ChatCssCustomization = {
  enabled: false,
  base: 'standard',
  css: '',
}

export const utf8Bytes = (text: string) => new TextEncoder().encode(text).byteLength

export const isCustomCssWithinLimit = (css: string) => css.length <= MAX_CUSTOM_CSS_BYTES && utf8Bytes(css) <= MAX_CUSTOM_CSS_BYTES

// Missing CSS on a complete, older profile means disabled, not "inherit the
// previously selected theme". Partial updates merge before normalization.
// Oversized stored source remains available for repair/export, but never runs.
export const normalizeCustomCss = (input: unknown): ChatCssCustomization => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { ...DEFAULT_CUSTOM_CSS }
  const raw = input as Record<string, unknown>
  const css = typeof raw.css === 'string' ? raw.css : ''
  const validBase = raw.base === 'standard' || raw.base === 'minimal'
  return {
    css,
    base: validBase ? raw.base as ChatCssCustomization['base'] : 'standard',
    enabled: raw.enabled === true && validBase && typeof raw.css === 'string' && isCustomCssWithinLimit(css),
  }
}

export const areCustomCssEqual = (left: ChatCssCustomization, right: ChatCssCustomization) =>
  left.enabled === right.enabled && left.base === right.base && left.css === right.css

export const usesMinimalChatStyles = (profile: ChatProfile) =>
  profile.cssCustomization.enabled && profile.cssCustomization.base === 'minimal' && isCustomCssWithinLimit(profile.cssCustomization.css)

export const disableProfileCustomCss = (profile: ChatProfile): ChatProfile =>
  profile.cssCustomization.enabled ? { ...profile, cssCustomization: { ...profile.cssCustomization, enabled: false } } : profile

// File imports never authorize CSS execution, including CSS in saved presets.
// Builtin IDs refer only to extension-owned, packaged profiles.
export const disableImportedCustomCss = (settings: ChatSettings): ChatSettings => ({
  ...settings,
  profile: disableProfileCustomCss(settings.profile),
  presets: settings.presets.map(preset =>
    preset.kind === 'custom' ? { ...preset, profile: disableProfileCustomCss(preset.profile) } : preset,
  ),
})
