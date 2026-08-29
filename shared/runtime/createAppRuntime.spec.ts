import { describe, expect, it, vi } from 'vitest'
import type { LocaleCode, LocaleMessages } from '@/shared/i18n/generated/translationTypes'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { PersistenceStatus, SettingsRepository, SettingsSnapshot } from '@/shared/settings/repository'
import { chatSettingsStateAtom, globalSettingsStateAtom, localeStateAtom, persistenceStatusAtom } from '@/shared/state/atoms'
import { commitGeometryAtom, commitProfileAtom, setThemeModeAtom, setYTDLiveChatEnabledAtom } from '@/shared/state/commands'
import { createAppRuntime } from './createAppRuntime'

const messages = (value: string) => ({ 'popup.theme': value }) as unknown as LocaleMessages

const defaultSnapshot = (): SettingsSnapshot => ({
  global: { ytdLiveChat: true, themeMode: 'system' },
  chat: structuredClone(DEFAULT_CHAT_SETTINGS),
  locale: 'en',
})

const createRepository = (overrides: Partial<SettingsRepository> = {}): SettingsRepository => ({
  load: vi.fn(async () => defaultSnapshot()),
  saveEnabled: vi.fn(async () => {}),
  saveTheme: vi.fn(async () => {}),
  saveAppearance: vi.fn(async () => {}),
  saveGeometry: vi.fn(async () => {}),
  saveLocale: vi.fn(async () => {}),
  replaceSettings: vi.fn(async () => {}),
  watch: vi.fn(() => vi.fn()),
  getPersistenceStatus: vi.fn((): PersistenceStatus => ({ status: 'idle', failedDomains: [] })),
  subscribePersistence: vi.fn(listener => {
    listener({ status: 'idle', failedDomains: [] })
    return vi.fn()
  }),
  retryFailed: vi.fn(async () => {}),
  flush: vi.fn(async () => {}),
  ...overrides,
})

const createDeferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(next => {
    resolve = next
  })
  return { promise, resolve }
}

describe('createAppRuntime', () => {
  it('boots with English messages when the selected locale fails to load', async () => {
    const repository = createRepository({
      load: vi.fn(async (): Promise<SettingsSnapshot> => ({ ...defaultSnapshot(), locale: 'ja' })),
    })
    const loadMessages = vi.fn(async (locale: LocaleCode) => {
      if (locale === 'ja') throw new Error('missing selected locale')
      return messages('English')
    })

    const runtime = await createAppRuntime(repository, { loadMessages })

    expect(loadMessages.mock.calls.map(([locale]) => locale)).toEqual(['ja', 'en'])
    expect(runtime.store.get(localeStateAtom)).toMatchObject({
      code: 'ja',
      messages: { 'popup.theme': 'English' },
    })
    expect(repository.saveLocale).not.toHaveBeenCalled()
    runtime.dispose()
  })

  it('rejects startup when the English base messages are unavailable', async () => {
    const unwatch = vi.fn()
    const unsubscribePersistence = vi.fn()
    const repository = createRepository({
      load: vi.fn(async (): Promise<SettingsSnapshot> => ({ ...defaultSnapshot(), locale: 'ja' })),
      watch: vi.fn(() => unwatch),
      subscribePersistence: vi.fn(() => unsubscribePersistence),
    })
    const loadMessages = vi.fn(async () => {
      throw new Error('no locale assets')
    })

    await expect(createAppRuntime(repository, { loadMessages })).rejects.toThrow('no locale assets')
    expect(loadMessages).toHaveBeenCalledTimes(2)
    expect(unwatch).toHaveBeenCalledTimes(1)
    expect(unsubscribePersistence).toHaveBeenCalledTimes(1)
  })

  it('persists a selected locale once when its messages use the English fallback', async () => {
    const repository = createRepository()
    const loadMessages = vi.fn(async (locale: LocaleCode) => {
      if (locale === 'ja') throw new Error('missing selected locale')
      return messages('English')
    })
    const runtime = await createAppRuntime(repository, { loadMessages })

    await runtime.setLocale('ja')

    expect(runtime.store.get(localeStateAtom)).toMatchObject({
      code: 'ja',
      messages: { 'popup.theme': 'English' },
    })
    expect(repository.saveLocale).toHaveBeenCalledTimes(1)
    expect(repository.saveLocale).toHaveBeenCalledWith('ja')
    runtime.dispose()
  })

  it('persists each ownership domain independently', async () => {
    const repository = createRepository()
    const runtime = await createAppRuntime(repository, { loadMessages: vi.fn(async () => messages('English')) })

    runtime.store.set(setYTDLiveChatEnabledAtom, false)
    runtime.store.set(setThemeModeAtom, 'dark')
    const profile = structuredClone(DEFAULT_CHAT_SETTINGS.profile)
    profile.appearance.fontSize = 27
    runtime.store.set(commitProfileAtom, profile)
    const geometry = {
      reference: 'player' as const,
      rect: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 },
      pinned: true,
    }
    runtime.store.set(commitGeometryAtom, geometry)

    expect(repository.saveEnabled).toHaveBeenCalledWith(false)
    expect(repository.saveTheme).toHaveBeenCalledWith('dark')
    expect(repository.saveAppearance).toHaveBeenCalledWith({
      profile: expect.objectContaining({ appearance: expect.objectContaining({ fontSize: 27 }) }),
      presets: DEFAULT_CHAT_SETTINGS.presets,
    })
    expect(repository.saveGeometry).toHaveBeenCalledWith(geometry)
    runtime.dispose()
  })

  it('keeps the latest external locale when translations resolve out of order', async () => {
    let handlers: Parameters<SettingsRepository['watch']>[0] | undefined
    const repository = createRepository({
      watch: vi.fn(nextHandlers => {
        handlers = nextHandlers
        return vi.fn()
      }),
    })
    const resolvers = new Map<LocaleCode, (value: LocaleMessages) => void>()
    const loadMessages = vi.fn((locale: LocaleCode) => {
      if (locale === 'en') return Promise.resolve(messages('English'))
      return new Promise<LocaleMessages>(resolve => resolvers.set(locale, resolve))
    })
    const runtime = await createAppRuntime(repository, { loadMessages })

    handlers?.onLocale('ja')
    handlers?.onLocale('fr')
    resolvers.get('fr')?.(messages('Français'))
    await vi.waitFor(() => expect(runtime.store.get(localeStateAtom).code).toBe('fr'))
    resolvers.get('ja')?.(messages('日本語'))
    await Promise.resolve()

    expect(runtime.store.get(localeStateAtom).code).toBe('fr')
    expect(repository.saveLocale).not.toHaveBeenCalled()
    runtime.dispose()
  })

  it('folds ownership-domain changes received during locale hydration into the initial state', async () => {
    let handlers: Parameters<SettingsRepository['watch']>[0] | undefined
    const repository = createRepository({
      watch: vi.fn(nextHandlers => {
        handlers = nextHandlers
        return vi.fn()
      }),
    })
    const englishMessages = createDeferred<LocaleMessages>()
    const japaneseMessages = createDeferred<LocaleMessages>()
    const loadMessages = vi.fn((locale: LocaleCode) => {
      if (locale === 'ja') return japaneseMessages.promise
      return englishMessages.promise
    })
    const runtimePromise = createAppRuntime(repository, { loadMessages })
    await vi.waitFor(() => expect(loadMessages).toHaveBeenCalledWith('en'))

    const profile = structuredClone(DEFAULT_CHAT_SETTINGS.profile)
    profile.appearance.fontSize = 27
    const geometry = {
      reference: 'legacy-viewport-px' as const,
      coordinates: { x: 120, y: 160 },
      size: { width: 640, height: 520 },
    }
    handlers?.onEnabled(false)
    handlers?.onTheme('dark')
    handlers?.onAppearance({ profile, presets: DEFAULT_CHAT_SETTINGS.presets })
    handlers?.onGeometry(geometry)
    handlers?.onLocale('ja')
    englishMessages.resolve(messages('English'))
    await vi.waitFor(() => expect(loadMessages).toHaveBeenCalledWith('ja'))
    japaneseMessages.resolve(messages('日本語'))

    const runtime = await runtimePromise
    expect(runtime.store.get(globalSettingsStateAtom)).toEqual({ ytdLiveChat: false, themeMode: 'dark' })
    expect(runtime.store.get(chatSettingsStateAtom)).toEqual({ profile, geometry, presets: DEFAULT_CHAT_SETTINGS.presets })
    expect(runtime.store.get(localeStateAtom)).toMatchObject({
      code: 'ja',
      messages: { 'popup.theme': '日本語' },
    })
    expect(repository.saveEnabled).not.toHaveBeenCalled()
    expect(repository.saveTheme).not.toHaveBeenCalled()
    expect(repository.saveAppearance).not.toHaveBeenCalled()
    expect(repository.saveGeometry).not.toHaveBeenCalled()
    runtime.dispose()
  })

  it('exposes repository failures and retries them through the shared runtime', async () => {
    let persistenceListener: ((status: PersistenceStatus) => void) | undefined
    const repository = createRepository({
      subscribePersistence: vi.fn(listener => {
        persistenceListener = listener
        listener({ status: 'idle', failedDomains: [] })
        return vi.fn()
      }),
    })
    const runtime = await createAppRuntime(repository, { loadMessages: vi.fn(async () => messages('English')) })

    persistenceListener?.({ status: 'error', failedDomains: ['geometry'] })
    expect(runtime.store.get(persistenceStatusAtom)).toEqual({ status: 'error', failedDomains: ['geometry'] })

    await runtime.retryPersistence()
    expect(repository.retryFailed).toHaveBeenCalledTimes(1)
    runtime.dispose()
  })
})
