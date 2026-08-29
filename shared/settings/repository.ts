import { browser } from 'wxt/browser'
import { storage } from 'wxt/utils/storage'
import { type LocaleCode, resolveLanguageCode } from '@/shared/i18n/language'
import { buildSettingsBackup, type SettingsBackup } from './backup'
import { DEFAULT_CHAT_SETTINGS, migrateSettings } from './migrateSettings'
import type { ChatGeometry, ChatProfile, ChatSettings, GlobalSettings, PresetEntry } from './model'
import {
  isRecord,
  normalizeChatGeometry,
  normalizeChatProfile,
  normalizeGlobalSetting,
  normalizePresets,
} from './normalizeSettings'
import {
  APPEARANCE_STORAGE_KEY,
  ENABLED_STORAGE_KEY,
  GEOMETRY_STORAGE_KEY,
  LEGACY_CHAT_STORAGE_KEY,
  LEGACY_GLOBAL_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from './storageKeys'

export type StoredEnvelope<T> = {
  schemaVersion: 1
  writerId: string
  value: T
}

export type ChatAppearanceSettings = {
  profile: ChatProfile
  presets: PresetEntry[]
}

export type SettingsSnapshot = {
  global: GlobalSettings
  chat: ChatSettings
  locale: LocaleCode
}

export type PersistenceDomain = 'enabled' | 'theme' | 'appearance' | 'geometry' | 'locale'

export type PersistenceStatus =
  | { status: 'idle'; failedDomains: readonly [] }
  | { status: 'saving'; failedDomains: readonly [] }
  | { status: 'error'; failedDomains: readonly PersistenceDomain[] }

export type SettingsRepository = {
  load: () => Promise<SettingsSnapshot>
  saveEnabled: (value: boolean) => Promise<void>
  saveTheme: (value: GlobalSettings['themeMode']) => Promise<void>
  saveAppearance: (value: ChatAppearanceSettings) => Promise<void>
  saveGeometry: (value: ChatGeometry) => Promise<void>
  saveLocale: (value: LocaleCode) => Promise<void>
  replaceSettings: (global: GlobalSettings, chat: ChatSettings) => Promise<void>
  watch: (handlers: {
    onEnabled: (value: boolean) => void
    onTheme: (value: GlobalSettings['themeMode']) => void
    onAppearance: (value: ChatAppearanceSettings) => void
    onGeometry: (value: ChatGeometry) => void
    onLocale: (value: LocaleCode) => void
  }) => () => void
  getPersistenceStatus: () => PersistenceStatus
  subscribePersistence: (listener: (status: PersistenceStatus) => void) => () => void
  retryFailed: () => Promise<void>
  flush: () => Promise<void>
}

const PERSISTENCE_DOMAINS: readonly PersistenceDomain[] = ['enabled', 'theme', 'appearance', 'geometry', 'locale']
const localKey = <T extends string>(key: T) => `local:${key}` as const

const enabledItem = storage.defineItem<StoredEnvelope<boolean>>(localKey(ENABLED_STORAGE_KEY))
const themeItem = storage.defineItem<StoredEnvelope<GlobalSettings['themeMode']>>(localKey(THEME_STORAGE_KEY))
const appearanceItem = storage.defineItem<StoredEnvelope<ChatAppearanceSettings>>(localKey(APPEARANCE_STORAGE_KEY))
const geometryItem = storage.defineItem<StoredEnvelope<ChatGeometry>>(localKey(GEOMETRY_STORAGE_KEY))
const localeItem = storage.defineItem<StoredEnvelope<LocaleCode>>(localKey(LOCALE_STORAGE_KEY))

// Compatibility inputs are read-only. Startup never rewrites or removes them.
const currentGlobalItem = storage.defineItem<unknown>(localKey(LEGACY_GLOBAL_STORAGE_KEY))
const currentChatItem = storage.defineItem<unknown>(localKey(LEGACY_CHAT_STORAGE_KEY))
const zustandGlobalItem = storage.defineItem<unknown>('local:globalSettingStore')
const zustandChatItem = storage.defineItem<unknown>('local:ytdLiveChatStore')
const legacyLocaleItem = storage.defineItem<unknown>('local:i18nextLng')

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = { ytdLiveChat: true, themeMode: 'system' }
const SAVE_RETRY_DELAY_MS = 400

type LegacyLocaleStorage = Pick<Storage, 'getItem'>

type RepositoryDependencies = {
  waitBeforeRetry: (delayMs: number) => Promise<void>
}

const defaultDependencies: RepositoryDependencies = {
  waitBeforeRetry: delayMs => new Promise(resolve => setTimeout(resolve, delayMs)),
}

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

const isStoredEnvelope = <T>(value: unknown): value is StoredEnvelope<T> =>
  isRecord(value) && value.schemaVersion === 1 && typeof value.writerId === 'string' && 'value' in value

const normalizeTheme = (input: unknown, fallback: GlobalSettings['themeMode']): GlobalSettings['themeMode'] =>
  input === 'light' || input === 'dark' || input === 'system' ? input : fallback

const normalizeAppearance = (input: unknown, fallback: ChatAppearanceSettings): ChatAppearanceSettings => {
  const raw = isRecord(input) ? input : {}
  return {
    profile: normalizeChatProfile(raw.profile, fallback.profile),
    presets: normalizePresets(raw.presets, fallback.presets),
  }
}

const normalizeCurrentGlobal = (input: unknown, fallback: GlobalSettings): GlobalSettings => {
  const value = isStoredEnvelope<unknown>(input) ? input.value : input
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
  const value = isStoredEnvelope<unknown>(input) ? input.value : input
  const raw = isRecord(value) ? value : {}
  return {
    profile: normalizeChatProfile(raw.profile, fallback.profile),
    geometry: normalizeChatGeometry(raw.geometry, fallback.geometry),
    presets: normalizePresets(raw.presets, fallback.presets),
  }
}

const readLegacyLocale = (legacyLocaleStorage: LegacyLocaleStorage | null) => {
  try {
    return legacyLocaleStorage?.getItem('i18nextLng') ?? undefined
  } catch {
    return undefined
  }
}

const getExtensionPageLegacyLocaleStorage = (): LegacyLocaleStorage | null => {
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

type SnapshotRead = {
  snapshot: SettingsSnapshot
  compatibilityLocaleToCopy: LocaleCode | null
}

const readSnapshot = async (legacyLocaleStorage: LegacyLocaleStorage | null): Promise<SnapshotRead> => {
  // Any browser.storage failure is fatal. Missing data is represented by
  // undefined values returned from a successful read, never by an exception.
  const [currentValues, compatibilityValues] = await Promise.all([
    storage.getItems([enabledItem, themeItem, appearanceItem, geometryItem, localeItem, currentGlobalItem, currentChatItem]),
    storage.getItems([zustandGlobalItem, zustandChatItem, legacyLocaleItem]),
  ])

  const legacyGlobal = normalizeLegacyGlobal(compatibilityValues[0]?.value)
  const legacyChat = migrateSettings(legacyState(compatibilityValues[1]?.value))
  const currentGlobal = normalizeCurrentGlobal(currentValues[5]?.value, legacyGlobal)
  const currentChat = normalizeCurrentChat(currentValues[6]?.value, legacyChat)

  const enabledEnvelope = currentValues[0]?.value
  const themeEnvelope = currentValues[1]?.value
  const appearanceEnvelope = currentValues[2]?.value
  const geometryEnvelope = currentValues[3]?.value
  const localeEnvelope = currentValues[4]?.value

  const fallbackAppearance: ChatAppearanceSettings = {
    profile: currentChat.profile,
    presets: currentChat.presets,
  }
  const appearance = isStoredEnvelope<unknown>(appearanceEnvelope)
    ? normalizeAppearance(appearanceEnvelope.value, fallbackAppearance)
    : fallbackAppearance
  const geometry = isStoredEnvelope<unknown>(geometryEnvelope)
    ? normalizeChatGeometry(geometryEnvelope.value, currentChat.geometry)
    : currentChat.geometry

  const extensionPageLocale = readLegacyLocale(legacyLocaleStorage)
  const browserLegacyLocale = compatibilityValues[2]?.value
  const storedCompatibilityLocale =
    extensionPageLocale ?? (typeof browserLegacyLocale === 'string' ? browserLegacyLocale : undefined)
  const fallbackLocale = resolveLanguageCode(storedCompatibilityLocale ?? getDefaultLocale())
  const hasCurrentLocale = isStoredEnvelope<unknown>(localeEnvelope) && typeof localeEnvelope.value === 'string'

  return {
    snapshot: {
      global: {
        ytdLiveChat:
          isStoredEnvelope<unknown>(enabledEnvelope) && typeof enabledEnvelope.value === 'boolean'
            ? enabledEnvelope.value
            : currentGlobal.ytdLiveChat,
        themeMode: isStoredEnvelope<unknown>(themeEnvelope)
          ? normalizeTheme(themeEnvelope.value, currentGlobal.themeMode)
          : currentGlobal.themeMode,
      },
      chat: {
        profile: appearance.profile,
        presets: appearance.presets,
        geometry,
      },
      locale: hasCurrentLocale ? resolveLanguageCode(localeEnvelope.value) : fallbackLocale,
    },
    // This is the only startup write: a non-destructive copy that lets the
    // content script converge with an extension-page-only legacy locale.
    compatibilityLocaleToCopy: !hasCurrentLocale && storedCompatibilityLocale !== undefined ? fallbackLocale : null,
  }
}

type FailedWrite = {
  sequence: number
  task: () => Promise<void>
  error: unknown
}

export const createSettingsRepository = (
  writerId = createWriterId(),
  legacyLocaleStorage = getExtensionPageLegacyLocaleStorage(),
  dependencies: RepositoryDependencies = defaultDependencies,
): SettingsRepository => {
  const tails = new Map<PersistenceDomain, Promise<void>>()
  const localSequences = new Map<PersistenceDomain, number>()
  const supersessionVersions = new Map<PersistenceDomain, number>()
  const activeCounts = new Map<PersistenceDomain, number>()
  const failedWrites = new Map<PersistenceDomain, FailedWrite>()
  const listeners = new Set<(status: PersistenceStatus) => void>()
  const watchHandlers = new Set<Parameters<SettingsRepository['watch']>[0]>()
  let storageUnwatchers: (() => void)[] | null = null

  const envelope = <T>(value: T): StoredEnvelope<T> => ({ schemaVersion: 1, writerId, value })

  const activeCount = () => [...activeCounts.values()].reduce((total, count) => total + count, 0)
  const getPersistenceStatus = (): PersistenceStatus => {
    const failedDomains = PERSISTENCE_DOMAINS.filter(domain => failedWrites.has(domain))
    if (failedDomains.length > 0) return { status: 'error', failedDomains }
    if (activeCount() > 0) return { status: 'saving', failedDomains: [] }
    return { status: 'idle', failedDomains: [] }
  }

  let previousStatus = JSON.stringify(getPersistenceStatus())
  const publishStatus = () => {
    const status = getPersistenceStatus()
    const signature = JSON.stringify(status)
    if (signature === previousStatus) return
    previousStatus = signature
    for (const listener of listeners) listener(status)
  }

  const nextLocalIntent = (domain: PersistenceDomain) => {
    const sequence = (localSequences.get(domain) ?? 0) + 1
    localSequences.set(domain, sequence)
    supersessionVersions.set(domain, (supersessionVersions.get(domain) ?? 0) + 1)
    failedWrites.delete(domain)
    return {
      sequence,
      supersessionVersion: supersessionVersions.get(domain) ?? 0,
    }
  }

  const acceptExternalCommit = (domain: PersistenceDomain) => {
    supersessionVersions.set(domain, (supersessionVersions.get(domain) ?? 0) + 1)
    failedWrites.delete(domain)
    publishStatus()
  }

  const notifyCommitted = (domain: PersistenceDomain, value: unknown) => {
    for (const handlers of watchHandlers) {
      if (domain === 'enabled' && typeof value === 'boolean') handlers.onEnabled(value)
      if (domain === 'theme') handlers.onTheme(normalizeTheme(value, DEFAULT_GLOBAL_SETTINGS.themeMode))
      if (domain === 'appearance') {
        handlers.onAppearance(
          normalizeAppearance(value, {
            profile: DEFAULT_CHAT_SETTINGS.profile,
            presets: DEFAULT_CHAT_SETTINGS.presets,
          }),
        )
      }
      if (domain === 'geometry') handlers.onGeometry(normalizeChatGeometry(value, DEFAULT_CHAT_SETTINGS.geometry))
      if (domain === 'locale' && typeof value === 'string') handlers.onLocale(resolveLanguageCode(value))
    }
  }

  const readCommittedValue = async (domain: PersistenceDomain) => {
    const item =
      domain === 'enabled'
        ? enabledItem
        : domain === 'theme'
          ? themeItem
          : domain === 'appearance'
            ? appearanceItem
            : domain === 'geometry'
              ? geometryItem
              : localeItem
    const [result] = await storage.getItems([item])
    return isStoredEnvelope<unknown>(result?.value) ? result.value.value : undefined
  }

  const runWithRetry = async (
    domain: PersistenceDomain,
    sequence: number,
    supersessionVersion: number,
    task: () => Promise<void>,
  ) => {
    try {
      await task()
      return true
    } catch (firstError) {
      await dependencies.waitBeforeRetry(SAVE_RETRY_DELAY_MS)
      // A newer local intent or an external commit supersedes this delayed
      // retry. Do not replay an obsolete value after the wait.
      if (
        localSequences.get(domain) !== sequence ||
        supersessionVersions.get(domain) !== supersessionVersion
      )
        return false
      try {
        await task()
        return true
      } catch {
        throw firstError
      }
    }
  }

  const enqueue = (domain: PersistenceDomain, task: () => Promise<void>) => {
    const { sequence, supersessionVersion } = nextLocalIntent(domain)
    activeCounts.set(domain, (activeCounts.get(domain) ?? 0) + 1)
    publishStatus()

    const previous = tails.get(domain) ?? Promise.resolve()
    const current = previous
      .catch(() => undefined)
      .then(async () => {
        // Coalesce a queued value when a newer local value already exists.
        if (localSequences.get(domain) !== sequence) return
        try {
          const committed = await runWithRetry(domain, sequence, supersessionVersion, task)
          if (!committed) return
          if (localSequences.get(domain) === sequence) {
            failedWrites.delete(domain)
            // Ignore own browser.storage events and explicitly read the final
            // committed value. This handles an external write racing with the
            // local set without letting an older queued local event overwrite
            // the newest in-memory intent.
            try {
              const value = await readCommittedValue(domain)
              if (value !== undefined && localSequences.get(domain) === sequence) notifyCommitted(domain, value)
            } catch {
              // The write itself succeeded. A later storage event or reload
              // will converge if this best-effort readback is unavailable.
            }
          }
        } catch (error) {
          if (
            localSequences.get(domain) === sequence &&
            supersessionVersions.get(domain) === supersessionVersion
          )
            failedWrites.set(domain, { sequence, task, error })
          throw error
        }
      })
      .finally(() => {
        const count = (activeCounts.get(domain) ?? 1) - 1
        if (count > 0) activeCounts.set(domain, count)
        else activeCounts.delete(domain)
        publishStatus()
      })
    tails.set(domain, current)
    return current
  }

  const saveEnabled = (value: boolean) => enqueue('enabled', () => enabledItem.setValue(envelope(Boolean(value))))
  const saveTheme = (value: GlobalSettings['themeMode']) =>
    enqueue('theme', () => themeItem.setValue(envelope(normalizeTheme(value, DEFAULT_GLOBAL_SETTINGS.themeMode))))
  const saveAppearance = (value: ChatAppearanceSettings) =>
    enqueue('appearance', () =>
      appearanceItem.setValue(
        envelope(
          normalizeAppearance(value, {
            profile: DEFAULT_CHAT_SETTINGS.profile,
            presets: DEFAULT_CHAT_SETTINGS.presets,
          }),
        ),
      ),
    )
  const saveGeometry = (value: ChatGeometry) =>
    enqueue('geometry', () => geometryItem.setValue(envelope(normalizeChatGeometry(value, DEFAULT_CHAT_SETTINGS.geometry))))
  const saveLocale = (value: LocaleCode) => enqueue('locale', () => localeItem.setValue(envelope(resolveLanguageCode(value))))

  const flush = async () => {
    while (true) {
      const observedTails = [...tails.entries()]
      await Promise.allSettled(observedTails.map(([, tail]) => tail))
      const tailsAreStable = observedTails.every(([domain, tail]) => tails.get(domain) === tail)
      if (tailsAreStable && activeCount() === 0) break
    }

    if (failedWrites.size > 0) {
      throw [...failedWrites.values()][0]?.error ?? new Error('Settings persistence failed')
    }
  }

  return {
    load: async () => {
      const result = await readSnapshot(legacyLocaleStorage)
      if (result.compatibilityLocaleToCopy !== null) {
        void saveLocale(result.compatibilityLocaleToCopy).catch(() => {
          // Persistence status remains visible and the user can retry. Startup
          // still uses the compatibility value without deleting it.
        })
      }
      return result.snapshot
    },
    saveEnabled,
    saveTheme,
    saveAppearance,
    saveGeometry,
    saveLocale,
    replaceSettings: async (global, chat) => {
      await flush()
      // A settings import is one browser.storage.set operation. It either
      // writes all ownership domains or reports failure before in-memory state
      // is replaced; it cannot leave a partially imported snapshot.
      await storage.setItems([
        { item: enabledItem, value: envelope(Boolean(global.ytdLiveChat)) },
        { item: themeItem, value: envelope(normalizeTheme(global.themeMode, DEFAULT_GLOBAL_SETTINGS.themeMode)) },
        {
          item: appearanceItem,
          value: envelope(
            normalizeAppearance(
              { profile: chat.profile, presets: chat.presets },
              { profile: DEFAULT_CHAT_SETTINGS.profile, presets: DEFAULT_CHAT_SETTINGS.presets },
            ),
          ),
        },
        { item: geometryItem, value: envelope(normalizeChatGeometry(chat.geometry, DEFAULT_CHAT_SETTINGS.geometry)) },
      ])
    },
    watch: handlers => {
      watchHandlers.add(handlers)
      if (!storageUnwatchers) {
        storageUnwatchers = [
          enabledItem.watch(next => {
            if (!isStoredEnvelope<unknown>(next) || next.writerId === writerId || typeof next.value !== 'boolean') return
            acceptExternalCommit('enabled')
            notifyCommitted('enabled', next.value)
          }),
          themeItem.watch(next => {
            if (!isStoredEnvelope<unknown>(next) || next.writerId === writerId) return
            acceptExternalCommit('theme')
            notifyCommitted('theme', next.value)
          }),
          appearanceItem.watch(next => {
            if (!isStoredEnvelope<unknown>(next) || next.writerId === writerId) return
            acceptExternalCommit('appearance')
            notifyCommitted('appearance', next.value)
          }),
          geometryItem.watch(next => {
            if (!isStoredEnvelope<unknown>(next) || next.writerId === writerId) return
            acceptExternalCommit('geometry')
            notifyCommitted('geometry', next.value)
          }),
          localeItem.watch(next => {
            if (!isStoredEnvelope<unknown>(next) || next.writerId === writerId || typeof next.value !== 'string') return
            acceptExternalCommit('locale')
            notifyCommitted('locale', next.value)
          }),
        ]
      }
      return () => {
        watchHandlers.delete(handlers)
        if (watchHandlers.size !== 0 || !storageUnwatchers) return
        for (const unwatch of storageUnwatchers) unwatch()
        storageUnwatchers = null
      }
    },
    getPersistenceStatus,
    subscribePersistence: listener => {
      listeners.add(listener)
      listener(getPersistenceStatus())
      return () => listeners.delete(listener)
    },
    retryFailed: async () => {
      const retries = [...failedWrites.entries()].flatMap(([domain, failed]) =>
        localSequences.get(domain) === failed.sequence ? [enqueue(domain, failed.task)] : [],
      )
      await Promise.all(retries)
    },
    flush,
  }
}

export const buildRepositoryBackup = (snapshot: SettingsSnapshot): SettingsBackup =>
  buildSettingsBackup({ globalSetting: snapshot.global, chatSettings: snapshot.chat })
