import { storage } from 'wxt/utils/storage'
import { type LocaleCode, resolveLanguageCode } from '@/shared/i18n/language'
import { buildSettingsBackup, type SettingsBackup } from './backup'
import { DEFAULT_CHAT_SETTINGS } from './migrateSettings'
import type { ChatGeometry, ChatSettings, GlobalSettings } from './model'
import { normalizeChatGeometry } from './normalizeSettings'
import { getExtensionPageLegacyLocaleStorage, readSettingsSnapshot } from './readSettingsSnapshot'
import {
  type ChatAppearanceSettings,
  DEFAULT_GLOBAL_SETTINGS,
  isStoredEnvelope,
  normalizeAppearance,
  normalizeTheme,
  PERSISTENCE_DOMAINS,
  type PersistenceDomain,
  type SettingsSnapshot,
  settingsItems,
  type StoredEnvelope,
} from './storageDomains'

export type { ChatAppearanceSettings, PersistenceDomain, SettingsSnapshot, StoredEnvelope } from './storageDomains'

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

const SAVE_RETRY_DELAY_MS = 400

type RepositoryDependencies = {
  waitBeforeRetry: (delayMs: number) => Promise<void>
}

const defaultDependencies: RepositoryDependencies = {
  waitBeforeRetry: delayMs => new Promise(resolve => setTimeout(resolve, delayMs)),
}

const createWriterId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `ylc-${Date.now()}-${Math.random().toString(36).slice(2)}`
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
    const [result] = await storage.getItems([settingsItems[domain]])
    return isStoredEnvelope(result?.value) ? result.value.value : undefined
  }

  const runWithRetry = async (domain: PersistenceDomain, sequence: number, supersessionVersion: number, task: () => Promise<void>) => {
    try {
      await task()
      return true
    } catch (firstError) {
      await dependencies.waitBeforeRetry(SAVE_RETRY_DELAY_MS)
      // A newer local intent or an external commit supersedes this delayed retry.
      if (localSequences.get(domain) !== sequence || supersessionVersions.get(domain) !== supersessionVersion) return false
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
        if (localSequences.get(domain) !== sequence) return
        try {
          const committed = await runWithRetry(domain, sequence, supersessionVersion, task)
          if (!committed) return
          if (localSequences.get(domain) === sequence) {
            failedWrites.delete(domain)
            // Read after the write, even if an external event arrived while
            // saving: the local write may have committed last. But an event
            // arriving DURING this read supersedes the returned snapshot.
            const readbackVersion = supersessionVersions.get(domain)
            try {
              const value = await readCommittedValue(domain)
              if (
                value !== undefined &&
                localSequences.get(domain) === sequence &&
                supersessionVersions.get(domain) === readbackVersion
              ) {
                notifyCommitted(domain, value)
              }
            } catch {
              // The write succeeded. A later event or reload can converge
              // when this best-effort readback is unavailable.
            }
          }
        } catch (error) {
          if (localSequences.get(domain) === sequence && supersessionVersions.get(domain) === supersessionVersion)
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

  const saveEnabled = (value: boolean) => enqueue('enabled', () => settingsItems.enabled.setValue(envelope(Boolean(value))))
  const saveTheme = (value: GlobalSettings['themeMode']) =>
    enqueue('theme', () => settingsItems.theme.setValue(envelope(normalizeTheme(value, DEFAULT_GLOBAL_SETTINGS.themeMode))))
  const saveAppearance = (value: ChatAppearanceSettings) =>
    enqueue('appearance', () =>
      settingsItems.appearance.setValue(
        envelope(
          normalizeAppearance(value, {
            profile: DEFAULT_CHAT_SETTINGS.profile,
            presets: DEFAULT_CHAT_SETTINGS.presets,
          }),
        ),
      ),
    )
  const saveGeometry = (value: ChatGeometry) =>
    enqueue('geometry', () => settingsItems.geometry.setValue(envelope(normalizeChatGeometry(value, DEFAULT_CHAT_SETTINGS.geometry))))
  const saveLocale = (value: LocaleCode) => enqueue('locale', () => settingsItems.locale.setValue(envelope(resolveLanguageCode(value))))

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
      const result = await readSettingsSnapshot(legacyLocaleStorage)
      if (result.compatibilityLocaleToCopy !== null) {
        void saveLocale(result.compatibilityLocaleToCopy).catch(() => {
          // Persistence status remains visible; the old locale is not deleted.
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
      // Keep imports as one bulk operation; interactive edits remain isolated
      // by domain. The runtime replaces its state only after this succeeds.
      await storage.setItems([
        { item: settingsItems.enabled, value: envelope(Boolean(global.ytdLiveChat)) },
        { item: settingsItems.theme, value: envelope(normalizeTheme(global.themeMode, DEFAULT_GLOBAL_SETTINGS.themeMode)) },
        {
          item: settingsItems.appearance,
          value: envelope(
            normalizeAppearance(
              { profile: chat.profile, presets: chat.presets },
              { profile: DEFAULT_CHAT_SETTINGS.profile, presets: DEFAULT_CHAT_SETTINGS.presets },
            ),
          ),
        },
        { item: settingsItems.geometry, value: envelope(normalizeChatGeometry(chat.geometry, DEFAULT_CHAT_SETTINGS.geometry)) },
      ])
    },
    watch: handlers => {
      watchHandlers.add(handlers)
      if (!storageUnwatchers) {
        storageUnwatchers = PERSISTENCE_DOMAINS.map(domain =>
          settingsItems[domain].watch(next => {
            if (!isStoredEnvelope(next) || next.writerId === writerId) return
            if (domain === 'enabled' && typeof next.value !== 'boolean') return
            if (domain === 'locale' && typeof next.value !== 'string') return
            acceptExternalCommit(domain)
            notifyCommitted(domain, next.value)
          }),
        )
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
