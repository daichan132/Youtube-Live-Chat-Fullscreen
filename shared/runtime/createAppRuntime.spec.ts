import { describe, expect, it, vi } from 'vitest'
import type { LocaleCode, LocaleMessages } from '@/shared/i18n/generated/translationTypes'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { SettingsRepository, SettingsSnapshot } from '@/shared/settings/repository'
import { localeStateAtom } from '@/shared/state/atoms'
import { createAppRuntime } from './createAppRuntime'

const messages = (value: string) => ({ 'popup.theme': value }) as unknown as LocaleMessages

describe('createAppRuntime', () => {
  it('boots with English messages when the selected locale fails to load', async () => {
    const repository: SettingsRepository = {
      load: vi.fn(
        async (): Promise<SettingsSnapshot> => ({
          global: { ytdLiveChat: true, themeMode: 'system' },
          chat: structuredClone(DEFAULT_CHAT_SETTINGS),
          locale: 'ja',
        }),
      ),
      saveGlobal: vi.fn(async () => {}),
      saveChat: vi.fn(async () => {}),
      saveLocale: vi.fn(async () => {}),
      replaceSettings: vi.fn(async () => {}),
      watch: vi.fn(() => vi.fn()),
      flush: vi.fn(async () => {}),
    }
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
    const repository: SettingsRepository = {
      load: vi.fn(
        async (): Promise<SettingsSnapshot> => ({
          global: { ytdLiveChat: true, themeMode: 'system' },
          chat: structuredClone(DEFAULT_CHAT_SETTINGS),
          locale: 'ja',
        }),
      ),
      saveGlobal: vi.fn(async () => {}),
      saveChat: vi.fn(async () => {}),
      saveLocale: vi.fn(async () => {}),
      replaceSettings: vi.fn(async () => {}),
      watch: vi.fn(() => vi.fn()),
      flush: vi.fn(async () => {}),
    }
    const loadMessages = vi.fn(async () => {
      throw new Error('no locale assets')
    })

    await expect(createAppRuntime(repository, { loadMessages })).rejects.toThrow('no locale assets')
    expect(loadMessages).toHaveBeenCalledTimes(2)
    expect(repository.watch).not.toHaveBeenCalled()
  })

  it('persists a selected locale once when its messages use the English fallback', async () => {
    const repository: SettingsRepository = {
      load: vi.fn(
        async (): Promise<SettingsSnapshot> => ({
          global: { ytdLiveChat: true, themeMode: 'system' },
          chat: structuredClone(DEFAULT_CHAT_SETTINGS),
          locale: 'en',
        }),
      ),
      saveGlobal: vi.fn(async () => {}),
      saveChat: vi.fn(async () => {}),
      saveLocale: vi.fn(async () => {}),
      replaceSettings: vi.fn(async () => {}),
      watch: vi.fn(() => vi.fn()),
      flush: vi.fn(async () => {}),
    }
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

  it('keeps the latest external locale when translations resolve out of order', async () => {
    let handlers: Parameters<SettingsRepository['watch']>[0] | undefined
    const repository: SettingsRepository = {
      load: vi.fn(
        async (): Promise<SettingsSnapshot> => ({
          global: { ytdLiveChat: true, themeMode: 'system' },
          chat: structuredClone(DEFAULT_CHAT_SETTINGS),
          locale: 'en',
        }),
      ),
      saveGlobal: vi.fn(async () => {}),
      saveChat: vi.fn(async () => {}),
      saveLocale: vi.fn(async () => {}),
      replaceSettings: vi.fn(async () => {}),
      watch: vi.fn(nextHandlers => {
        handlers = nextHandlers
        return vi.fn()
      }),
      flush: vi.fn(async () => {}),
    }
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
})
