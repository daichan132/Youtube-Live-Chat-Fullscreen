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

// A readback is an acknowledgement only when the stored writer is this repository.
export type SettingsCommitSource = 'external' | 'readback' | 'import'

export type SettingsRepository = {
  load: () => Promise<SettingsSnapshot>
  saveEnabled: (value: boolean) => Promise<void>
  saveTheme: (value: GlobalSettings['themeMode']) => Promise<void>
  saveAppearance: (value: ChatAppearanceSettings) => Promise<void>
  saveGeometry: (value: ChatGeometry) => Promise<void>
  saveLocale: (value: LocaleCode) => Promise<void>
  // Confirmed imported values are delivered through watch, like ordinary commits.
  replaceSettings: (global: GlobalSettings, chat: ChatSettings) => Promise<void>
  watch: (handlers: {
    onEnabled: (value: boolean) => void
    onTheme: (value: GlobalSettings['themeMode']) => void
    onAppearance: (value: ChatAppearanceSettings, source?: SettingsCommitSource) => void
    onGeometry: (value: ChatGeometry) => void
    onLocale: (value: LocaleCode, source?: SettingsCommitSource) => void
  }) => () => void
  getPersistenceStatus: () => PersistenceStatus
  subscribePersistence: (listener: (status: PersistenceStatus) => void) => () => void
  retryFailed: () => Promise<void>
  flush: () => Promise<void>
}

const SAVE_RETRY_DELAY_MS = 400
const IMPORT_DOMAINS = ['enabled', 'theme', 'appearance', 'geometry'] as const satisfies readonly PersistenceDomain[]

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
  let replacementTail: Promise<void> | null = null

  const envelope = <T>(value: T): StoredEnvelope<T> => ({ schemaVersion: 1, writerId, value })

  const activeCount = () => [...activeCounts.values()].reduce((total, count) => total + count, 0)
  const getPersistenceStatus = (): PersistenceStatus => {
    const failedDomains = PERSISTENCE_DOMAINS.filter(domain => failedWrites.has(domain))
    if (failedDomains.length > 0) return { status: 'error', failedDomains }
    if (activeCount() > 0 || replacementTail) return { status: 'saving', failedDomains: [] }
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

  const notifyCommitted = (domain: PersistenceDomain, value: unknown, source: SettingsCommitSource) => {
    for (const handlers of watchHandlers) {
      if (domain === 'enabled' && typeof value === 'boolean') handlers.onEnabled(value)
      if (domain === 'theme') handlers.onTheme(normalizeTheme(value, DEFAULT_GLOBAL_SETTINGS.themeMode))
      if (domain === 'appearance') {
        handlers.onAppearance(
          normalizeAppearance(value, {
            profile: DEFAULT_CHAT_SETTINGS.profile,
            presets: DEFAULT_CHAT_SETTINGS.presets,
          }),
          source,
        )
      }
      if (domain === 'geometry') handlers.onGeometry(normalizeChatGeometry(value, DEFAULT_CHAT_SETTINGS.geometry))
      if (domain === 'locale' && typeof value === 'string') handlers.onLocale(resolveLanguageCode(value), source)
    }
  }

  const readCommittedEnvelope = async (domain: PersistenceDomain) => {
    const [result] = await storage.getItems([settingsItems[domain]])
    return isStoredEnvelope(result?.value) ? result.value : null
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
    const previous = tails.get(domain) ?? Promise.resolve()
    const barrier = replacementTail
    const current = Promise.allSettled(barrier ? [previous, barrier] : [previous])
      .then(async () => {
        if (localSequences.get(domain) !== sequence) return
        try {
          const committed = await runWithRetry(domain, sequence, supersessionVersion, task)
          if (!committed) return
          if (localSequences.get(domain) === sequence) {
            failedWrites.delete(domain)
            // An event before this read may precede the local commit. Only
            // events arriving during the read supersede its captured snapshot.
            const readbackVersion = supersessionVersions.get(domain)
            try {
              const stored = await readCommittedEnvelope(domain)
              if (stored && localSequences.get(domain) === sequence && supersessionVersions.get(domain) === readbackVersion) {
                notifyCommitted(domain, stored.value, stored.writerId === writerId ? 'readback' : 'external')
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
    publishStatus()
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

  const throwPersistenceFailure = () => {
    if (failedWrites.size > 0) throw [...failedWrites.values()][0]?.error ?? new Error('Settings persistence failed')
  }

  const flush = async () => {
    while (true) {
      const observedTails = [...tails.entries()]
      const observedReplacement = replacementTail
      await Promise.allSettled([...observedTails.map(([, tail]) => tail), ...(observedReplacement ? [observedReplacement] : [])])
      const tailsAreStable = observedTails.every(([domain, tail]) => tails.get(domain) === tail)
      if (tailsAreStable && replacementTail === observedReplacement && activeCount() === 0) break
    }
    throwPersistenceFailure()
  }

  const replaceSettings = (global: GlobalSettings, chat: ChatSettings) => {
    // Reserve the barrier synchronously. Later writes must wait for this import,
    // while this import waits only for operations already queued before it.
    // Calling flush here would also wait for later writes and create a cycle.
    const preceding = [...tails.values(), ...(replacementTail ? [replacementTail] : [])]
    const sequences = new Map(localSequences)
    const values = [
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
    ]
    const current: Promise<void> = Promise.allSettled(preceding)
      .then(async () => {
        throwPersistenceFailure()
        await storage.setItems(values)
        const versions = new Map(supersessionVersions)
        const results = await storage.getItems(IMPORT_DOMAINS.map(domain => settingsItems[domain]))
        const envelopes = results.map(result => (isStoredEnvelope(result.value) ? result.value : null))
        if (envelopes.length !== IMPORT_DOMAINS.length || envelopes.some(stored => stored === null)) {
          throw new Error('Imported settings could not be read back')
        }
        for (const [index, domain] of IMPORT_DOMAINS.entries()) {
          const stored = envelopes[index]
          if (
            !stored ||
            localSequences.get(domain) !== sequences.get(domain) ||
            supersessionVersions.get(domain) !== versions.get(domain)
          )
            continue
          // Deliver while the read is still current, not via a later caller's
          // unconditional snapshot replacement. Newer intents keep their UI.
          notifyCommitted(domain, stored.value, stored.writerId === writerId ? 'import' : 'external')
        }
      })
      .finally(() => {
        if (replacementTail === current) replacementTail = null
        publishStatus()
      })
    replacementTail = current
    publishStatus()
    // The popup closes after import resolves. Drain later edits too, but only
    // after releasing the barrier those edits depend on (never inside it).
    return current.then(flush)
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
    replaceSettings,
    watch: handlers => {
      watchHandlers.add(handlers)
      if (!storageUnwatchers) {
        storageUnwatchers = PERSISTENCE_DOMAINS.map(domain =>
          settingsItems[domain].watch(next => {
            if (!isStoredEnvelope(next) || next.writerId === writerId) return
            if (domain === 'enabled' && typeof next.value !== 'boolean') return
            if (domain === 'locale' && typeof next.value !== 'string') return
            acceptExternalCommit(domain)
            notifyCommitted(domain, next.value, 'external')
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
