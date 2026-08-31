import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from './migrateSettings'
import { createSettingsRepository, type StoredEnvelope } from './repository'
import {
  APPEARANCE_STORAGE_KEY,
  ENABLED_STORAGE_KEY,
  GEOMETRY_STORAGE_KEY,
  LEGACY_CHAT_STORAGE_KEY,
  LEGACY_GLOBAL_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from './storageKeys'

const ALL_KEYS = [
  ENABLED_STORAGE_KEY,
  THEME_STORAGE_KEY,
  APPEARANCE_STORAGE_KEY,
  GEOMETRY_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  LEGACY_GLOBAL_STORAGE_KEY,
  LEGACY_CHAT_STORAGE_KEY,
  'globalSettingStore',
  'ytdLiveChatStore',
  'i18nextLng',
]

const immediateRetry = { waitBeforeRetry: vi.fn(async () => {}) }
const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>(next => {
    resolve = next
  })
  return { promise, resolve }
}

const emptyHandlers = () => ({
  onEnabled: vi.fn(),
  onTheme: vi.fn(),
  onAppearance: vi.fn(),
  onGeometry: vi.fn(),
  onLocale: vi.fn(),
})

describe('settings repository', () => {
  beforeEach(async () => {
    localStorage.clear()
    await chrome.storage.local.remove(ALL_KEYS)
    immediateRetry.waitBeforeRetry.mockClear()
    vi.restoreAllMocks()
  })

  it('keeps one versioned envelope with writer identity', () => {
    const envelope: StoredEnvelope<boolean> = { schemaVersion: 1, writerId: 'writer', value: true }
    expect(envelope).toEqual({ schemaVersion: 1, writerId: 'writer', value: true })
  })

  it('loads current and legacy settings without rewriting global or chat data during startup', async () => {
    await chrome.storage.local.set({
      [LEGACY_GLOBAL_STORAGE_KEY]: {
        schemaVersion: 1,
        writerId: 'old-current-writer',
        value: { ytdLiveChat: false, themeMode: 'dark' },
      },
      [LEGACY_CHAT_STORAGE_KEY]: {
        schemaVersion: 1,
        writerId: 'old-current-writer',
        value: {
          ...DEFAULT_CHAT_SETTINGS,
          profile: {
            ...DEFAULT_CHAT_SETTINGS.profile,
            appearance: { ...DEFAULT_CHAT_SETTINGS.profile.appearance, fontSize: 24 },
          },
        },
      },
      [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'new', value: 'ja' },
    })
    const set = vi.spyOn(chrome.storage.local, 'set')
    const remove = vi.spyOn(chrome.storage.local, 'remove')

    const snapshot = await createSettingsRepository('reader', localStorage, immediateRetry).load()

    expect(snapshot.global).toEqual({ ytdLiveChat: false, themeMode: 'dark' })
    expect(snapshot.chat.profile.appearance.fontSize).toBe(24)
    expect(snapshot.locale).toBe('ja')
    expect(set).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })

  it('copies a compatibility locale once without deleting the old value', async () => {
    localStorage.setItem('i18nextLng', 'ja')
    const repository = createSettingsRepository('locale-copy', localStorage, immediateRetry)
    repository.watch(emptyHandlers())

    expect((await repository.load()).locale).toBe('ja')
    await repository.flush()
    expect((await chrome.storage.local.get(LOCALE_STORAGE_KEY))[LOCALE_STORAGE_KEY]).toMatchObject({ value: 'ja' })
    expect(localStorage.getItem('i18nextLng')).toBe('ja')
  })

  it('uses version-zero light theme compatibility without persisting it at startup', async () => {
    await chrome.storage.local.set({
      globalSettingStore: JSON.stringify({ state: { ytdLiveChat: false }, version: 0 }),
    })
    const set = vi.spyOn(chrome.storage.local, 'set')

    const snapshot = await createSettingsRepository('v0-reader', null, immediateRetry).load()

    expect(snapshot.global).toEqual({ ytdLiveChat: false, themeMode: 'light' })
    expect(set).not.toHaveBeenCalled()
  })

  it('fails closed when browser storage cannot be read', async () => {
    const set = vi.spyOn(chrome.storage.local, 'set')
    const remove = vi.spyOn(chrome.storage.local, 'remove')
    vi.spyOn(chrome.storage.local, 'get').mockRejectedValue(new Error('storage unavailable'))

    await expect(createSettingsRepository('failed-reader', null, immediateRetry).load()).rejects.toThrow('storage unavailable')
    expect(set).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })

  it('gives each new ownership domain precedence over compatibility snapshots', async () => {
    await chrome.storage.local.set({
      [LEGACY_GLOBAL_STORAGE_KEY]: {
        schemaVersion: 1,
        writerId: 'old',
        value: { ytdLiveChat: true, themeMode: 'light' },
      },
      [LEGACY_CHAT_STORAGE_KEY]: {
        schemaVersion: 1,
        writerId: 'old',
        value: DEFAULT_CHAT_SETTINGS,
      },
      [ENABLED_STORAGE_KEY]: { schemaVersion: 1, writerId: 'new', value: false },
      [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'new', value: 'dark' },
      [APPEARANCE_STORAGE_KEY]: {
        schemaVersion: 1,
        writerId: 'new',
        value: {
          profile: {
            ...DEFAULT_CHAT_SETTINGS.profile,
            appearance: { ...DEFAULT_CHAT_SETTINGS.profile.appearance, fontSize: 31 },
          },
          presets: DEFAULT_CHAT_SETTINGS.presets,
        },
      },
      [GEOMETRY_STORAGE_KEY]: {
        schemaVersion: 1,
        writerId: 'new',
        value: {
          reference: 'player',
          rect: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 },
          pinned: true,
        },
      },
      [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'new', value: 'fr' },
    })

    const snapshot = await createSettingsRepository('new-reader', null, immediateRetry).load()

    expect(snapshot.global).toEqual({ ytdLiveChat: false, themeMode: 'dark' })
    expect(snapshot.chat.profile.appearance.fontSize).toBe(31)
    expect(snapshot.chat.geometry).toEqual({
      reference: 'player',
      rect: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 },
      pinned: true,
    })
    expect(snapshot.locale).toBe('fr')
  })

  it('preserves concurrent appearance and geometry writes from different contexts', async () => {
    const appearanceWriter = createSettingsRepository('appearance-writer', null, immediateRetry)
    const geometryWriter = createSettingsRepository('geometry-writer', null, immediateRetry)
    const profile = structuredClone(DEFAULT_CHAT_SETTINGS.profile)
    profile.appearance.fontSize = 29
    const geometry = {
      reference: 'player' as const,
      rect: { x: 0.1, y: 0.2, width: 0.35, height: 0.45 },
      pinned: true,
    }

    await Promise.all([
      appearanceWriter.saveAppearance({ profile, presets: DEFAULT_CHAT_SETTINGS.presets }),
      geometryWriter.saveGeometry(geometry),
    ])

    const snapshot = await createSettingsRepository('reader', null, immediateRetry).load()
    expect(snapshot.chat.profile.appearance.fontSize).toBe(29)
    expect(snapshot.chat.geometry).toEqual(geometry)
  })

  it('forwards both own and external committed values so every context converges on storage', async () => {
    const handlers = emptyHandlers()
    const repository = createSettingsRepository('self-writer', null, immediateRetry)
    const unwatch = repository.watch(handlers)

    await repository.saveEnabled(false)
    await vi.waitFor(() => expect(handlers.onEnabled).toHaveBeenCalledWith(false))

    await chrome.storage.local.set({
      [ENABLED_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other', value: true },
      [GEOMETRY_STORAGE_KEY]: {
        schemaVersion: 1,
        writerId: 'other',
        value: DEFAULT_CHAT_SETTINGS.geometry,
      },
    })

    await vi.waitFor(() => expect(handlers.onEnabled).toHaveBeenLastCalledWith(true))
    expect(handlers.onGeometry).toHaveBeenCalledWith(DEFAULT_CHAT_SETTINGS.geometry)
    unwatch()
  })

  it('retries one failed save and returns to idle after success', async () => {
    const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
    let attempts = 0
    vi.spyOn(chrome.storage.local, 'set').mockImplementation(async values => {
      attempts += 1
      if (attempts === 1) throw new Error('transient write failure')
      await originalSet(values)
    })
    const repository = createSettingsRepository('retry-writer', null, immediateRetry)
    repository.watch(emptyHandlers())

    await repository.saveTheme('dark')

    expect(attempts).toBe(2)
    expect(immediateRetry.waitBeforeRetry).toHaveBeenCalledTimes(1)
    expect(repository.getPersistenceStatus()).toEqual({ status: 'idle', failedDomains: [] })
  })

  it('keeps a current failed write visible, makes flush fail, and supports manual retry', async () => {
    const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
    let shouldFail = true
    vi.spyOn(chrome.storage.local, 'set').mockImplementation(async values => {
      if (shouldFail) throw new Error('persistent write failure')
      await originalSet(values)
    })
    const repository = createSettingsRepository('manual-retry-writer', null, immediateRetry)
    repository.watch(emptyHandlers())
    const statuses: string[] = []
    repository.subscribePersistence(status => statuses.push(status.status))

    await expect(repository.saveEnabled(false)).rejects.toThrow('persistent write failure')
    expect(repository.getPersistenceStatus()).toEqual({ status: 'error', failedDomains: ['enabled'] })
    await expect(repository.flush()).rejects.toThrow('persistent write failure')

    shouldFail = false
    await repository.retryFailed()
    await repository.flush()

    expect(repository.getPersistenceStatus()).toEqual({ status: 'idle', failedDomains: [] })
    expect(statuses).toContain('error')
    expect((await chrome.storage.local.get(ENABLED_STORAGE_KEY))[ENABLED_STORAGE_KEY]).toMatchObject({ value: false })
  })

  it('invalidates a failed retry when another context commits a newer value', async () => {
    const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
    vi.spyOn(chrome.storage.local, 'set').mockImplementation(async values => {
      const theme = (values as Record<string, unknown>)[THEME_STORAGE_KEY] as { writerId?: string } | undefined
      if (theme?.writerId === 'failed-writer') throw new Error('offline')
      await originalSet(values)
    })
    const repository = createSettingsRepository('failed-writer', null, immediateRetry)
    repository.watch(emptyHandlers())

    await expect(repository.saveTheme('dark')).rejects.toThrow('offline')
    await originalSet({
      [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other', value: 'light' },
    })
    await vi.waitFor(() => expect(repository.getPersistenceStatus()).toEqual({ status: 'idle', failedDomains: [] }))

    await repository.retryFailed()
    expect((await chrome.storage.local.get(THEME_STORAGE_KEY))[THEME_STORAGE_KEY]).toMatchObject({ value: 'light' })
  })

  it('writes an imported snapshot with one bulk storage operation', async () => {
    const repository = createSettingsRepository('importer', null, immediateRetry)
    const set = vi.spyOn(chrome.storage.local, 'set')
    const profile = structuredClone(DEFAULT_CHAT_SETTINGS.profile)
    profile.appearance.fontSize = 30

    await repository.replaceSettings({ ytdLiveChat: false, themeMode: 'dark' }, { ...DEFAULT_CHAT_SETTINGS, profile })

    expect(set).toHaveBeenCalledTimes(1)
    expect(set.mock.calls[0]?.[0]).toMatchObject({
      [ENABLED_STORAGE_KEY]: { value: false },
      [THEME_STORAGE_KEY]: { value: 'dark' },
      [APPEARANCE_STORAGE_KEY]: { value: { profile: { appearance: { fontSize: 30 } } } },
      [GEOMETRY_STORAGE_KEY]: { value: DEFAULT_CHAT_SETTINGS.geometry },
    })
  })

  it('waits for a newer domain write that is queued while flush is pending', async () => {
    const firstStarted = deferred()
    const releaseFirst = deferred()
    const secondStarted = deferred()
    const releaseSecond = deferred()
    const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
    let writes = 0
    vi.spyOn(chrome.storage.local, 'set').mockImplementation(async values => {
      writes += 1
      if (writes === 1) {
        firstStarted.resolve()
        await releaseFirst.promise
      } else if (writes === 2) {
        secondStarted.resolve()
        await releaseSecond.promise
      }
      await originalSet(values)
    })
    const repository = createSettingsRepository('flush-writer', null, immediateRetry)
    repository.watch(emptyHandlers())

    const firstWrite = repository.saveEnabled(false)
    await firstStarted.promise
    let flushFinished = false
    const flushing = repository.flush().then(() => {
      flushFinished = true
    })
    const secondWrite = repository.saveTheme('dark')

    releaseFirst.resolve()
    await secondStarted.promise
    expect(flushFinished).toBe(false)

    releaseSecond.resolve()
    await Promise.all([firstWrite, secondWrite, flushing])
    expect(flushFinished).toBe(true)
  })
})
