import { browser } from 'wxt/browser'
import { storage } from 'wxt/utils/storage'
import { type LocaleCode, resolveLanguageCode } from '@/shared/i18n/language'
import { migrateSettings } from './migrateSettings'
import type { ChatSettings, GlobalSettings } from './model'
import { isRecord, normalizeChatGeometry, normalizeChatSettings, normalizeGlobalSetting } from './normalizeSettings'
import {
  type ChatAppearanceSettings,
  DEFAULT_GLOBAL_SETTINGS,
  isStoredEnvelope,
  localKey,
  normalizeAppearance,
  normalizeTheme,
  type SettingsSnapshot,
  settingsItems,
} from './storageDomains'
import { LEGACY_CHAT_STORAGE_KEY, LEGACY_GLOBAL_STORAGE_KEY } from './storageKeys'

export type LegacyLocaleStorage = Pick<Storage, 'getItem'>

type SnapshotRead = {
  snapshot: SettingsSnapshot
  compatibilityLocaleToCopy: LocaleCode | null
}

// Compatibility inputs are read-only. Startup never rewrites or removes them.
const currentGlobalItem = storage.defineItem<unknown>(localKey(LEGACY_GLOBAL_STORAGE_KEY))
const currentChatItem = storage.defineItem<unknown>(localKey(LEGACY_CHAT_STORAGE_KEY))
const zustandGlobalItem = storage.defineItem<unknown>('local:globalSettingStore')
const zustandChatItem = storage.defineItem<unknown>('local:ytdLiveChatStore')
const legacyLocaleItem = storage.defineItem<unknown>('local:i18nextLng')

const parseLegacy = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'string') return isRecord(value) ? value : {}
  try {
    const parsed: unknown = JSON.parse(value)
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const legacyState = (value: unknown) => {
  const parsed = parseLegacy(value)
  return isRecord(parsed.state) ? parsed.state : parsed
}

const normalizeCurrentGlobal = (input: unknown, fallback: GlobalSettings): GlobalSettings => {
  const value = isStoredEnvelope(input) ? input.value : input
  const normalized = normalizeGlobalSetting(value)
  return {
    ytdLiveChat: normalized.ytdLiveChat ?? fallback.ytdLiveChat,
    themeMode: normalized.themeMode ?? fallback.themeMode,
  }
}

const normalizeLegacyGlobal = (input: unknown): GlobalSettings => {
  const parsed = parseLegacy(input)
  const normalized = normalizeGlobalSetting(legacyState(parsed))
  return {
    ytdLiveChat: normalized.ytdLiveChat ?? DEFAULT_GLOBAL_SETTINGS.ytdLiveChat,
    themeMode: normalized.themeMode ?? (parsed.version === 0 ? 'light' : DEFAULT_GLOBAL_SETTINGS.themeMode),
  }
}

const normalizeCurrentChat = (input: unknown, fallback: ChatSettings): ChatSettings => {
  const value = isStoredEnvelope(input) ? input.value : input
  return normalizeChatSettings(value, fallback)
}

const readLegacyLocale = (legacyLocaleStorage: LegacyLocaleStorage | null) => {
  try {
    return legacyLocaleStorage?.getItem('i18nextLng') ?? undefined
  } catch {
    return undefined
  }
}

export const getExtensionPageLegacyLocaleStorage = (): LegacyLocaleStorage | null => {
  if (typeof globalThis.location === 'undefined') return null
  try {
    if (typeof globalThis.localStorage === 'undefined') return null
    const currentUrl = new URL(globalThis.location.href)
    const extensionUrl = new URL(browser.runtime.getURL('/'))
    if (currentUrl.protocol !== extensionUrl.protocol || currentUrl.host !== extensionUrl.host) return null
    return globalThis.localStorage
  } catch {
    return null
  }
}

const getDefaultLocale = () => {
  if (typeof browser.i18n?.getUILanguage !== 'function') return resolveLanguageCode(undefined)
  try {
    return resolveLanguageCode(browser.i18n.getUILanguage())
  } catch {
    return resolveLanguageCode(undefined)
  }
}

export const readSettingsSnapshot = async (legacyLocaleStorage: LegacyLocaleStorage | null): Promise<SnapshotRead> => {
  // Missing values come from successful reads. Storage failures must abort
  // initialization rather than authorizing fallback writes or deletion.
  const [
    [enabledItem, themeItem, appearanceItem, geometryItem, localeItem, currentGlobalResult, currentChatResult],
    [legacyGlobalResult, legacyChatResult, legacyLocaleResult],
  ] = await Promise.all([
    storage.getItems([
      settingsItems.enabled,
      settingsItems.theme,
      settingsItems.appearance,
      settingsItems.geometry,
      settingsItems.locale,
      currentGlobalItem,
      currentChatItem,
    ]),
    storage.getItems([zustandGlobalItem, zustandChatItem, legacyLocaleItem]),
  ])

  const legacyGlobal = normalizeLegacyGlobal(legacyGlobalResult?.value)
  const legacyChat = migrateSettings(legacyState(legacyChatResult?.value))
  const currentGlobal = normalizeCurrentGlobal(currentGlobalResult?.value, legacyGlobal)
  const currentChat = normalizeCurrentChat(currentChatResult?.value, legacyChat)

  const enabledEnvelope = enabledItem?.value
  const themeEnvelope = themeItem?.value
  const appearanceEnvelope = appearanceItem?.value
  const geometryEnvelope = geometryItem?.value
  const localeEnvelope = localeItem?.value

  const fallbackAppearance: ChatAppearanceSettings = {
    profile: currentChat.profile,
    presets: currentChat.presets,
  }
  const appearance = isStoredEnvelope(appearanceEnvelope)
    ? normalizeAppearance(appearanceEnvelope.value, fallbackAppearance)
    : fallbackAppearance
  const geometry = isStoredEnvelope(geometryEnvelope)
    ? normalizeChatGeometry(geometryEnvelope.value, currentChat.geometry)
    : currentChat.geometry

  const extensionPageLocale = readLegacyLocale(legacyLocaleStorage)
  const browserLegacyLocale = legacyLocaleResult?.value
  const storedCompatibilityLocale = extensionPageLocale ?? (typeof browserLegacyLocale === 'string' ? browserLegacyLocale : undefined)
  const fallbackLocale = resolveLanguageCode(storedCompatibilityLocale ?? getDefaultLocale())
  const currentLocale =
    isStoredEnvelope(localeEnvelope) && typeof localeEnvelope.value === 'string' ? resolveLanguageCode(localeEnvelope.value) : null

  return {
    snapshot: {
      global: {
        ytdLiveChat:
          isStoredEnvelope(enabledEnvelope) && typeof enabledEnvelope.value === 'boolean'
            ? enabledEnvelope.value
            : currentGlobal.ytdLiveChat,
        themeMode: isStoredEnvelope(themeEnvelope) ? normalizeTheme(themeEnvelope.value, currentGlobal.themeMode) : currentGlobal.themeMode,
      },
      chat: {
        profile: appearance.profile,
        presets: appearance.presets,
        geometry,
      },
      locale: currentLocale ?? fallbackLocale,
    },
    // The repository may copy this locale non-destructively, so content
    // scripts can converge with extension-page-only localStorage settings.
    compatibilityLocaleToCopy: currentLocale === null && storedCompatibilityLocale !== undefined ? fallbackLocale : null,
  }
}
