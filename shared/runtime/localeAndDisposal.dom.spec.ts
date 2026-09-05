import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LocaleCode, LocaleMessages } from '@/shared/i18n/generated/translationTypes'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { PersistenceStatus, SettingsRepository } from '@/shared/settings/repository'
import { EMPTY_MESSAGES, globalSettingsStateAtom, localeStateAtom } from '@/shared/state/atoms'
import { type AppRuntime, createAppRuntime } from './createAppRuntime'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(next => {
    resolve = next
  })
  return { promise, resolve }
}

const messages = (locale: LocaleCode): LocaleMessages => ({ ...EMPTY_MESSAGES, 'popup.theme': locale })
const runtimes: AppRuntime[] = []

const createSession = async (loadMessages: (locale: LocaleCode) => Promise<LocaleMessages>) => {
  let watched: Parameters<SettingsRepository['watch']>[0] | undefined
  const repository: SettingsRepository = {
    load: async () => ({ global: { ytdLiveChat: true, themeMode: 'system' }, chat: structuredClone(DEFAULT_CHAT_SETTINGS), locale: 'en' }),
    saveEnabled: vi.fn(async () => {}),
    saveTheme: vi.fn(async () => {}),
    saveAppearance: vi.fn(async () => {}),
    saveGeometry: vi.fn(async () => {}),
    saveLocale: vi.fn(async () => {}),
    replaceSettings: vi.fn(async () => {}),
    watch: handlers => {
      watched = handlers
      return () => {
        watched = undefined
      }
    },
    getPersistenceStatus: (): PersistenceStatus => ({ status: 'idle', failedDomains: [] }),
    subscribePersistence: () => () => {},
    retryFailed: async () => {},
    flush: async () => {},
  }
  const runtime = await createAppRuntime(repository, { loadMessages })
  runtimes.push(runtime)
  return {
    runtime,
    repository,
    emitLocale: (locale: LocaleCode) => {
      if (!watched) throw new Error('No active settings subscription')
      watched.onLocale(locale)
    },
  }
}

afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.dispose()
  vi.restoreAllMocks()
})

describe('locale request and runtime disposal boundaries', () => {
  it('invalidates an external load even when the next commit matches the rendered locale', async () => {
    const japanese = deferred<LocaleMessages>()
    const load = vi.fn((locale: LocaleCode) => (locale === 'ja' ? japanese.promise : Promise.resolve(messages(locale))))
    const { runtime, repository, emitLocale } = await createSession(load)
    emitLocale('ja')
    expect(load).toHaveBeenCalledWith('ja')
    emitLocale('en')
    japanese.resolve(messages('ja'))
    // A task boundary drains the entire loader/fallback/notification promise
    // chain before this negative assertion, not just the source promise.
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    expect(runtime.store.get(localeStateAtom)).toMatchObject({ code: 'en', messages: { 'popup.theme': 'en' } })
    expect(repository.saveLocale).not.toHaveBeenCalled()
  })

  it('does not cancel a new local language choice with an unchanged save acknowledgement', async () => {
    const french = deferred<LocaleMessages>()
    const { runtime, repository, emitLocale } = await createSession(locale =>
      locale === 'fr' ? french.promise : Promise.resolve(messages(locale)),
    )
    await runtime.setLocale('ja')
    const selectingFrench = runtime.setLocale('fr')
    emitLocale('ja')
    french.resolve(messages('fr'))
    await selectingFrench

    expect(runtime.store.get(localeStateAtom).code).toBe('fr')
    expect(repository.saveLocale).toHaveBeenLastCalledWith('fr')
  })

  it('keeps a newer local choice when an older external load finishes', async () => {
    const japanese = deferred<LocaleMessages>()
    const { runtime, emitLocale } = await createSession(locale =>
      locale === 'ja' ? japanese.promise : Promise.resolve(messages(locale)),
    )
    emitLocale('ja')
    await runtime.setLocale('fr')
    japanese.resolve(messages('ja'))
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    expect(runtime.store.get(localeStateAtom).code).toBe('fr')
  })

  it('rejects an import started after disposal without calling storage', async () => {
    const { runtime, repository } = await createSession(locale => Promise.resolve(messages(locale)))
    const backup = runtime.exportSettings()
    runtime.dispose()

    await expect(runtime.importSettings(backup)).rejects.toThrow('disposed')
    expect(repository.replaceSettings).not.toHaveBeenCalled()
  })

  it('does not apply an already-started import after disposal', async () => {
    const { runtime, repository } = await createSession(locale => Promise.resolve(messages(locale)))
    const write = deferred<void>()
    vi.mocked(repository.replaceSettings).mockReturnValue(write.promise)
    const previous = runtime.store.get(globalSettingsStateAtom)
    const importing = runtime.importSettings({ ...runtime.exportSettings(), globalSetting: { ytdLiveChat: false, themeMode: 'dark' } })
    runtime.dispose()
    write.resolve()
    await importing

    expect(repository.replaceSettings).toHaveBeenCalledOnce()
    expect(runtime.store.get(globalSettingsStateAtom)).toBe(previous)
  })
})
