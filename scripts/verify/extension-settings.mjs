import { randomUUID } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { isDeepStrictEqual } from 'node:util'
import { localeCodes } from '../../shared/i18n/generated/localeMetadata.ts'
import { APPEARANCE_NUMBER_LIMITS } from '../../shared/settings/appearanceLimits.ts'
import { MAX_CHAT_HEIGHT_RATIO, MAX_CHAT_WIDTH_RATIO } from '../../shared/settings/chatGeometry.ts'
import { DEFAULT_CHAT_PROFILE } from '../../shared/settings/defaults.ts'
import { BUILTIN_PRESET_IDS } from '../../shared/settings/model.ts'
import { MAX_SETTINGS_BACKUP_BYTES } from '../../shared/settings/persistConfig.ts'
import {
  APPEARANCE_STORAGE_KEY,
  ENABLED_STORAGE_KEY,
  GEOMETRY_STORAGE_KEY,
  LEGACY_CHAT_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from '../../shared/settings/storageKeys.ts'
import { isThemeMode } from '../../shared/theme/themeMode.ts'
import { ALLOWED_FONT_FAMILIES } from '../../shared/utils/fontFamilyPolicy.ts'

const keysByDomain = {
  enabled: ENABLED_STORAGE_KEY,
  theme: THEME_STORAGE_KEY,
  locale: LOCALE_STORAGE_KEY,
  profile: APPEARANCE_STORAGE_KEY,
  geometry: GEOMETRY_STORAGE_KEY,
}
const appearanceFields = [
  'backgroundColor',
  'fontColor',
  'membershipNameColor',
  'fontFamily',
  'fontSize',
  'blur',
  'spacing',
  'showUserName',
  'showUserIcon',
  'showSuperChatBar',
]
const owns = (value, key) => Object.hasOwn(value, key)
const invalid = label => {
  throw new Error(`Invalid settings patch: ${label}`)
}
const record = (value, fields, label, requireAll = false) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    invalid(`${label} must be an object`)
  }
  if (Object.keys(value).some(key => !fields.includes(key))) invalid(`${label} contains an unsupported field`)
  if (Object.keys(value).length === 0) invalid(`${label} must contain a setting`)
  if (requireAll && fields.some(key => !owns(value, key))) invalid(`${label} is incomplete`)
}
const finite = (value, min, max, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    invalid(`${label} must be a finite number between ${min} and ${max}`)
  }
}
const boolean = (value, label) => {
  if (typeof value !== 'boolean') invalid(`${label} must be a boolean`)
}
const choice = (value, choices, label) => {
  if (!choices.includes(value)) invalid(`${label} is unsupported`)
}
const color = (value, label) => {
  record(value, ['r', 'g', 'b', 'a'], label)
  for (const key of Object.keys(value)) finite(value[key], 0, key === 'a' ? 1 : 255, `${label}.${key}`)
}
const validateProfile = profile => {
  record(profile, ['appearance', 'display'], 'profile')
  if (owns(profile, 'appearance')) {
    const appearance = profile.appearance
    record(appearance, appearanceFields, 'profile.appearance')
    for (const key of ['backgroundColor', 'fontColor']) {
      if (owns(appearance, key)) color(appearance[key], `profile.appearance.${key}`)
    }
    if (owns(appearance, 'membershipNameColor')) {
      const membership = appearance.membershipNameColor
      record(membership, ['mode', 'value'], 'profile.appearance.membershipNameColor')
      choice(membership.mode, ['youtube-default', 'custom'], 'profile.appearance.membershipNameColor.mode')
      if (membership.mode === 'custom') color(membership.value, 'profile.appearance.membershipNameColor.value')
      else if (owns(membership, 'value')) invalid('youtube-default membership color cannot contain a value')
    }
    if (owns(appearance, 'fontFamily') && appearance.fontFamily !== null) {
      choice(appearance.fontFamily, ALLOWED_FONT_FAMILIES, 'profile.appearance.fontFamily')
    }
    for (const [key, { min, max }] of Object.entries(APPEARANCE_NUMBER_LIMITS)) {
      if (owns(appearance, key)) finite(appearance[key], min, max, `profile.appearance.${key}`)
    }
    for (const key of ['showUserName', 'showUserIcon', 'showSuperChatBar']) {
      if (owns(appearance, key)) boolean(appearance[key], `profile.appearance.${key}`)
    }
  }
  if (owns(profile, 'display')) {
    record(profile.display, ['idleVisibility', 'contentMode'], 'profile.display')
    if (owns(profile.display, 'idleVisibility')) {
      choice(profile.display.idleVisibility, ['auto-hide', 'always-visible'], 'profile.display.idleVisibility')
    }
    if (owns(profile.display, 'contentMode')) {
      choice(profile.display.contentMode, ['full-chat', 'messages-only'], 'profile.display.contentMode')
    }
  }
}
const validatePatch = patch => {
  record(patch, Object.keys(keysByDomain), 'root')
  if (owns(patch, 'enabled')) boolean(patch.enabled, 'enabled')
  if (owns(patch, 'theme') && !isThemeMode(patch.theme)) invalid('theme is unsupported')
  if (owns(patch, 'locale')) choice(patch.locale, localeCodes, 'locale')
  if (owns(patch, 'profile')) validateProfile(patch.profile)
  if (owns(patch, 'geometry')) {
    const geometry = patch.geometry
    record(geometry, ['reference', 'rect', 'pinned'], 'geometry', true)
    choice(geometry.reference, ['player'], 'geometry.reference')
    boolean(geometry.pinned, 'geometry.pinned')
    record(geometry.rect, ['x', 'y', 'width', 'height'], 'geometry.rect', true)
    // Match the renderer's player-relative bounds; reject instead of silently clamping.
    finite(geometry.rect.width, Number.MIN_VALUE, MAX_CHAT_WIDTH_RATIO, 'geometry.rect.width')
    finite(geometry.rect.height, Number.MIN_VALUE, MAX_CHAT_HEIGHT_RATIO, 'geometry.rect.height')
    finite(geometry.rect.x, 0, 1 - geometry.rect.width, 'geometry.rect.x')
    finite(geometry.rect.y, 0, 1 - geometry.rect.height, 'geometry.rect.y')
  }
  return structuredClone(patch)
}

export const readSettingsPatch = async filePath => {
  if ((await stat(filePath)).size > MAX_SETTINGS_BACKUP_BYTES) invalid('file exceeds 1 MiB')
  const bytes = await readFile(filePath)
  if (bytes.byteLength > MAX_SETTINGS_BACKUP_BYTES) invalid('file exceeds 1 MiB')
  let patch
  try {
    patch = JSON.parse(bytes.toString('utf8'))
  } catch {
    invalid('file must contain valid JSON')
  }
  return validatePatch(patch)
}

const mergeProfile = (current, patch) => {
  const appearance = { ...current.appearance, ...patch.appearance }
  for (const key of ['backgroundColor', 'fontColor']) {
    if (patch.appearance?.[key]) appearance[key] = { ...current.appearance[key], ...patch.appearance[key] }
  }
  const membership = patch.appearance?.membershipNameColor
  if (membership?.mode === 'custom') {
    const fallback =
      current.appearance.membershipNameColor.mode === 'custom' ? current.appearance.membershipNameColor.value : current.appearance.fontColor
    appearance.membershipNameColor = { mode: 'custom', value: { ...fallback, ...membership.value } }
  }
  return { ...current, appearance, display: { ...current.display, ...patch.display } }
}

const evaluateInWorld = async (cdp, contextId, extensionId, operation) => {
  const result = await cdp.send('Runtime.evaluate', {
    contextId,
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      if (typeof chrome === 'undefined' || chrome.runtime?.id !== ${JSON.stringify(extensionId)}) {
        throw new Error('Extension context identity changed')
      }
      ${operation}
    })()`,
  })
  // Do not echo exception descriptions: an extension/browser error could contain page data.
  if (result.exceptionDetails) throw new Error('Extension settings operation failed in the verified context')
  return result.result?.value
}

export const applyExtensionSettings = async ({ page, extensionId, patch: input }) => {
  const patch = validatePatch(input)
  if (typeof extensionId !== 'string' || !/^[a-p]{32}$/.test(extensionId)) throw new Error('A verified Chrome extension ID is required')
  const cdp = await page.context().newCDPSession(page)
  const contexts = new Map()
  cdp.on('Runtime.executionContextCreated', ({ context }) => contexts.set(context.id, context))
  cdp.on('Runtime.executionContextDestroyed', ({ executionContextId }) => contexts.delete(executionContextId))
  cdp.on('Runtime.executionContextsCleared', () => contexts.clear())
  try {
    const { frameTree } = await cdp.send('Page.getFrameTree')
    await cdp.send('Runtime.enable')
    const deadline = Date.now() + 15000
    let contextId
    while (!contextId && Date.now() < deadline) {
      for (const context of contexts.values()) {
        if (context.auxData?.isDefault || context.auxData?.frameId !== frameTree.frame.id) continue
        try {
          const { result } = await cdp.send('Runtime.evaluate', {
            contextId: context.id,
            returnByValue: true,
            expression: `typeof chrome !== 'undefined' && chrome.runtime?.id === ${JSON.stringify(extensionId)} && typeof chrome.storage?.local?.get === 'function' && typeof chrome.storage?.local?.set === 'function'`,
          })
          if (result?.value === true) {
            contextId = context.id
            break
          }
        } catch {
          // Navigation may destroy a candidate world before the identity probe finishes.
        }
      }
      if (!contextId) await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (!contextId) throw new Error('The verified extension content-script context is unavailable on the selected page')
    const domains = Object.keys(patch)
    const keys = domains.map(domain => keysByDomain[domain])
    const compatibilityKeys = owns(patch, 'profile') ? [LEGACY_CHAT_STORAGE_KEY, 'ytdLiveChatStore'] : []
    const current = await evaluateInWorld(
      cdp,
      contextId,
      extensionId,
      `return await chrome.storage.local.get(${JSON.stringify([...keys, ...compatibilityKeys])})`,
    )
    const writerId = `ylc-verification-${randomUUID()}`
    const items = {}
    for (const domain of domains) {
      const key = keysByDomain[domain]
      let value = patch[domain]
      if (domain === 'profile') {
        const envelope = current[key]
        if (envelope === undefined && compatibilityKeys.some(compatibilityKey => current[compatibilityKey] !== undefined)) {
          throw new Error('Legacy appearance settings require migration to the current domain; no settings were written')
        }
        if (
          envelope !== undefined &&
          (envelope?.schemaVersion !== 1 || typeof envelope.writerId !== 'string' || !owns(envelope, 'value'))
        ) {
          throw new Error('Existing appearance settings use an unsupported envelope; no settings were written')
        }
        const appearance = envelope?.value
        if (
          envelope !== undefined &&
          (!appearance ||
            typeof appearance !== 'object' ||
            Array.isArray(appearance) ||
            !owns(appearance, 'profile') ||
            !Array.isArray(appearance.presets))
        ) {
          throw new Error('Existing appearance settings are invalid; no settings were written')
        }
        const existingProfile = appearance?.profile ?? DEFAULT_CHAT_PROFILE
        validateProfile(existingProfile)
        const profile = mergeProfile(mergeProfile(DEFAULT_CHAT_PROFILE, existingProfile), patch.profile)
        value = { ...appearance, profile, presets: appearance?.presets ?? BUILTIN_PRESET_IDS.map(id => ({ kind: 'builtin', id })) }
      }
      items[key] = { schemaVersion: 1, writerId, value }
    }
    const readback = await evaluateInWorld(
      cdp,
      contextId,
      extensionId,
      `
      await chrome.storage.local.set(${JSON.stringify(items)})
      return await chrome.storage.local.get(${JSON.stringify(keys)})
    `,
    )
    if (keys.some(key => !isDeepStrictEqual(items[key], readback?.[key]))) {
      throw new Error('Settings readback differs from the requested patch; the write was not confirmed and may have committed')
    }
    return { writerId, domains, keys, verified: true }
  } finally {
    await cdp.detach().catch(() => {})
  }
}
