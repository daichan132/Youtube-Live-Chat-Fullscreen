export type ChatCssCustomization = {
  enabled: boolean
  css: string
}

export type SavedChatCss = {
  id: string
  name: string
  css: string
}

export const DEFAULT_CUSTOM_CSS: ChatCssCustomization = { enabled: false, css: '' }
export const MAX_CUSTOM_CSS_BYTES = 64 * 1024
export const MAX_SAVED_CHAT_CSS = 20
export const MAX_CSS_NAME_LENGTH = 100
// Separate domain budgets leave room in the existing 1 MiB settings backup.
export const MAX_CSS_DOMAIN_BYTES = 256 * 1024
export const utf8Bytes = (text: string) => new TextEncoder().encode(text).byteLength
export const isCustomCssWithinLimit = (css: string) => css.length <= MAX_CUSTOM_CSS_BYTES && utf8Bytes(css) <= MAX_CUSTOM_CSS_BYTES

export type CustomCssErrorCode =
  | 'invalid'
  | 'too-large'
  | 'library-full'
  | 'library-too-large'
  | 'duplicate-name'
  | 'conflict'
  | 'unconfirmed'
  | 'busy'

export class CustomCssError extends Error {
  constructor(readonly code: CustomCssErrorCode) {
    super(code)
    this.name = 'CustomCssError'
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Both persistence writes and readback/watch boundaries receive untrusted
// values. Assertion signatures keep runtime validation and narrowing together.
export function assertCustomCss(value: unknown): asserts value is ChatCssCustomization {
  if (!isRecord(value) || typeof value.css !== 'string' || typeof value.enabled !== 'boolean') {
    throw new CustomCssError('invalid')
  }
  const persisted = { enabled: value.enabled, css: value.css }
  if (!isCustomCssWithinLimit(value.css) || utf8Bytes(JSON.stringify(persisted, null, 2)) > MAX_CSS_DOMAIN_BYTES) {
    throw new CustomCssError('too-large')
  }
}

export function assertSavedChatCss(entries: unknown): asserts entries is SavedChatCss[] {
  if (!Array.isArray(entries)) throw new CustomCssError('invalid')
  if (entries.length > MAX_SAVED_CHAT_CSS) throw new CustomCssError('library-full')
  const ids = new Set<string>()
  const names = new Set<string>()
  for (const entry of entries) {
    if (
      !isRecord(entry) || typeof entry.id !== 'string' || !entry.id || entry.id.length > 128 || ids.has(entry.id) ||
      typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > MAX_CSS_NAME_LENGTH
    ) {
      throw new CustomCssError('invalid')
    }
    if (names.has(entry.name.trim())) throw new CustomCssError('duplicate-name')
    names.add(entry.name.trim())
    ids.add(entry.id)
    assertCustomCss({ enabled: false, css: entry.css })
  }
  // Only declared fields are persisted; do not serialize arbitrary extra input.
  const persisted = entries.map(({ id, name, css }) => ({ id, name, css }))
  if (utf8Bytes(JSON.stringify(persisted, null, 2)) > MAX_CSS_DOMAIN_BYTES) throw new CustomCssError('library-too-large')
}

export const areCustomCssEqual = (left: ChatCssCustomization, right: ChatCssCustomization) =>
  left.enabled === right.enabled && left.css === right.css

// Reading an old or malformed setting never authorizes execution. Keep the
// source text for repair; this is deliberately not a CSS syntax sanitizer.
export const normalizeCustomCss = (input: unknown): ChatCssCustomization => {
  const raw = isRecord(input) ? input : {}
  const result = { css: typeof raw.css === 'string' ? raw.css : '', enabled: raw.enabled === true && typeof raw.css === 'string' }
  try {
    assertCustomCss(result)
    return result
  } catch {
    return { ...result, enabled: false }
  }
}

export const normalizeSavedChatCss = (input: unknown): SavedChatCss[] => {
  if (!Array.isArray(input)) return []
  const ids = new Set<string>()
  return input.filter((entry): entry is SavedChatCss => {
    if (
      !isRecord(entry) || typeof entry.id !== 'string' || !entry.id || entry.id.length > 128 ||
      typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > MAX_CSS_NAME_LENGTH ||
      typeof entry.css !== 'string' || ids.has(entry.id)
    ) return false
    ids.add(entry.id)
    return true
  }).map(({ id, name, css }) => ({ id, name, css }))
}

export const readCustomCssBackup = (input: unknown): { customCss: ChatCssCustomization; savedChatCss: SavedChatCss[] } => {
  const raw = isRecord(input) ? input : {}
  const customCss = Object.hasOwn(raw, 'customCss') ? raw.customCss : DEFAULT_CUSTOM_CSS
  const savedChatCss = Object.hasOwn(raw, 'savedChatCss') ? raw.savedChatCss : []
  // Files are stricter than startup recovery. A malformed source must not be
  // silently normalized to an empty value that replaces the user's settings.
  assertCustomCss(customCss)
  assertSavedChatCss(savedChatCss)
  return { customCss: { css: customCss.css, enabled: false }, savedChatCss: normalizeSavedChatCss(savedChatCss) }
}

export const areSavedChatCssEqual = (left: SavedChatCss[], right: SavedChatCss[]) =>
  left.length === right.length && left.every((entry, index) => {
    const other = right[index]
    return other !== undefined && entry.id === other.id && entry.name === other.name && entry.css === other.css
  })
