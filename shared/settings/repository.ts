import { browser } from 'wxt/browser'
import { storage } from 'wxt/utils/storage'
import { type LocaleCode, resolveLanguageCode } from '@/shared/i18n/language'
import { buildSettingsBackup, type SettingsBackup } from './backup'
import { areChatSettingsEqual, areGlobalSettingsEqual } from './equality'
import { DEFAULT_CHAT_SETTINGS, migrateSettings } from './migrateSettings'
import type { ChatSettings, GlobalSettings } from './model'
import { normalizeChatSettings, normalizeGlobalSetting } from './normalizeSettings'
import { CHAT_STORAGE_KEY, GLOBAL_STORAGE_KEY, LOCALE_STORAGE_KEY } from './storageKeys'

export type StoredEnvelope<T> = {
  schemaVersion: 1
  writerId: string
  value: T
}

export type SettingsSnapshot = {
  global: GlobalSettings
  chat: ChatSettings
  locale: LocaleCode
}

export type SettingsRepository = {
  load: () => Promise<SettingsSnapshot>
  saveGlobal: (value: GlobalSettings) => Promise<void>
  saveChat: (value: ChatSettings) => Promise<void>
  saveLocale: (value: LocaleCode) => Promise<void>
  replaceSettings: (global: GlobalSettings, chat: ChatSettings) => Promise<void>
  watch: (handlers: {
    onGlobal: (value: GlobalSettings) => void
    onChat: (value: ChatSettings) => void
    onLocale: (value: LocaleCode) => void
  }) => () => void
  flush: () => Promise<void>
}

const GLOBAL_KEY = `local:${GLOBAL_STORAGE_KEY}` as const
const CHAT_KEY = `local:${CHAT_STORAGE_KEY}` as const
const LOCALE_KEY = `local:${LOCALE_STORAGE_KEY}` as const
const LEGACY_GLOBAL_KEY = 'globalSettingStore'
const LEGACY_CHAT_KEY = 'ytdLiveChatStore'
const LEGACY_LOCALE_KEY = 'i18nextLng'

const globalItem = storage.defineItem<StoredEnvelope<GlobalSettings>>(GLOBAL_KEY)
const chatItem = storage.defineItem<StoredEnvelope<ChatSettings>>(CHAT_KEY)
const localeItem = storage.defineItem<StoredEnvelope<LocaleCode>>(LOCALE_KEY)

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = { ytdLiveChat: true, themeMode: 'system' }

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

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

const createWriterId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `ylc-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const normalizeGlobal = (input: unknown): GlobalSettings => {
  const normalized = normalizeGlobalSetting(input)
  return {
    ytdLiveChat: normalized.ytdLiveChat ?? DEFAULT_GLOBAL_SETTINGS.ytdLiveChat,
    themeMode: normalized.themeMode ?? DEFAULT_GLOBAL_SETTINGS.themeMode,
  }
}

const enqueueWrites = () => {
  let queue = Promise.resolve()
  return (task: () => Promise<void>) => {
    queue = queue.then(task, task)
    return queue
  }
}

const removeLegacyKeys = async () => {
  await browser.storage.local.remove([LEGACY_GLOBAL_KEY, LEGACY_CHAT_KEY, LEGACY_LOCALE_KEY])
}

const isStoredEnvelope = <T>(value: unknown): value is StoredEnvelope<T> =>
  isRecord(value) && value.schemaVersion === 1 && typeof value.writerId === 'string' && 'value' in value

const isStoredChatSettings = (value: unknown): value is ChatSettings => {
  if (!isRecord(value) || !isRecord(value.profile) || !isRecord(value.geometry) || !Array.isArray(value.presets)) return false
  try {
    return areChatSettingsEqual(value as ChatSettings, normalizeChatSettings(value, DEFAULT_CHAT_SETTINGS))
  } catch {
    return false
  }
}

const readCurrentValues = async () => {
  const values = await Promise.all(
    [globalItem, chatItem, localeItem].map(async item => {
      try {
        return await item.getValue()
      } catch {
        return undefined
      }
    }),
  )
  return { global: values[0], chat: values[1], locale: values[2] }
}

const readLegacySnapshot = async (): Promise<SettingsSnapshot> => {
  const values = await browser.storage.local.get([LEGACY_GLOBAL_KEY, LEGACY_CHAT_KEY, LEGACY_LOCALE_KEY])
  const global = normalizeGlobal(legacyState(values[LEGACY_GLOBAL_KEY]))
  const chat = migrateSettings(legacyState(values[LEGACY_CHAT_KEY]))
  let locale: LocaleCode = resolveLanguageCode(typeof values[LEGACY_LOCALE_KEY] === 'string' ? values[LEGACY_LOCALE_KEY] : undefined)
  if (locale === 'en' && typeof browser.i18n?.getUILanguage === 'function') {
    try {
      locale = resolveLanguageCode(browser.i18n.getUILanguage())
    } catch {
      // Some extension test environments do not implement i18n.getUILanguage.
    }
  }
  return { global, chat, locale }
}

export const createSettingsRepository = (writerId = createWriterId()): SettingsRepository => {
  const enqueue = enqueueWrites()

  const envelope = <T>(value: T): StoredEnvelope<T> => ({ schemaVersion: 1, writerId, value })

  const load = async () => {
    const current = await readCurrentValues()
    const currentGlobal = isStoredEnvelope<GlobalSettings>(current.global) ? normalizeGlobal(current.global.value) : null
    const currentChat =
      isStoredEnvelope<unknown>(current.chat) && isStoredChatSettings(current.chat.value)
        ? normalizeChatSettings(current.chat.value, DEFAULT_CHAT_SETTINGS)
        : null
    const currentLocale = isStoredEnvelope<LocaleCode>(current.locale) ? resolveLanguageCode(current.locale.value) : null
    if (currentGlobal && currentChat && currentLocale) return { global: currentGlobal, chat: currentChat, locale: currentLocale }

    const legacy = await readLegacySnapshot()
    const migrated = {
      global: currentGlobal ?? legacy.global,
      chat: currentChat ?? legacy.chat,
      locale: currentLocale ?? legacy.locale,
    }
    await enqueue(async () => {
      await Promise.all([
        globalItem.setValue(envelope(migrated.global)),
        chatItem.setValue(envelope(migrated.chat)),
        localeItem.setValue(envelope(migrated.locale)),
      ])
      const written = await readCurrentValues()
      const verified =
        isStoredEnvelope<GlobalSettings>(written.global) &&
        written.global.writerId === writerId &&
        areGlobalSettingsEqual(normalizeGlobal(written.global.value), migrated.global) &&
        isStoredEnvelope<ChatSettings>(written.chat) &&
        written.chat.writerId === writerId &&
        areChatSettingsEqual(normalizeChatSettings(written.chat.value, DEFAULT_CHAT_SETTINGS), migrated.chat) &&
        isStoredEnvelope<LocaleCode>(written.locale) &&
        written.locale.writerId === writerId &&
        resolveLanguageCode(written.locale.value) === migrated.locale
      if (verified) await removeLegacyKeys()
    })
    return migrated
  }

  const saveGlobal = (value: GlobalSettings) => enqueue(() => globalItem.setValue(envelope(normalizeGlobal(value))))
  const saveChat = (value: ChatSettings) => enqueue(() => chatItem.setValue(envelope(normalizeChatSettings(value, DEFAULT_CHAT_SETTINGS))))
  const saveLocale = (value: LocaleCode) => enqueue(() => localeItem.setValue(envelope(resolveLanguageCode(value))))

  return {
    load,
    saveGlobal,
    saveChat,
    saveLocale,
    replaceSettings: (global, chat) =>
      enqueue(() =>
        Promise.all([
          globalItem.setValue(envelope(normalizeGlobal(global))),
          chatItem.setValue(envelope(normalizeChatSettings(chat, DEFAULT_CHAT_SETTINGS))),
        ]).then(() => undefined),
      ),
    watch: handlers => {
      const unwatchGlobal = globalItem.watch(next => {
        if (next?.writerId !== writerId && next?.value) handlers.onGlobal(normalizeGlobal(next.value))
      })
      const unwatchChat = chatItem.watch(next => {
        if (next?.writerId !== writerId && next?.value) handlers.onChat(normalizeChatSettings(next.value, DEFAULT_CHAT_SETTINGS))
      })
      const unwatchLocale = localeItem.watch(next => {
        if (next?.writerId !== writerId && next?.value) handlers.onLocale(resolveLanguageCode(next.value))
      })
      return () => {
        unwatchGlobal()
        unwatchChat()
        unwatchLocale()
      }
    },
    flush: async () => {
      await enqueue(async () => {})
    },
  }
}

export const buildRepositoryBackup = (snapshot: SettingsSnapshot): SettingsBackup =>
  buildSettingsBackup({ globalSetting: snapshot.global, chatSettings: snapshot.chat })
