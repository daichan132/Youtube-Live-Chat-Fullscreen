import { describe, expect, it, vi } from 'vitest'
import type { LocaleMessages } from '@/shared/i18n/generated/translationTypes'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { PersistenceStatus, SettingsRepository, SettingsSnapshot } from '@/shared/settings/repository'
import { chatSettingsStateAtom, globalSettingsStateAtom, localeStateAtom } from '@/shared/state/atoms'
import { createAppRuntime } from './createAppRuntime'

const messages = (label: string) => ({ 'popup.theme': label }) as unknown as LocaleMessages

const createRepository = (saveLocale: SettingsRepository['saveLocale']): SettingsRepository => ({
  load: vi.fn(
    async (): Promise<SettingsSnapshot> => ({
      global: { ytdLiveChat: true, themeMode: 'system' },
      chat: structuredClone(DEFAULT_CHAT_SETTINGS),
      locale: 'en',
    }),
  ),
  saveEnabled: vi.fn(async () => {}),
  saveTheme: vi.fn(async () => {}),
  saveAppearance: vi.fn(async () => {}),
  saveGeometry: vi.fn(async () => {}),
  saveLocale,
  replaceSettings: vi.fn(async () => {}),
  watch: vi.fn(() => vi.fn()),
  getPersistenceStatus: vi.fn((): PersistenceStatus => ({ status: 'idle', failedDomains: [] })),
  subscribePersistence: vi.fn(listener => {
    listener({ status: 'idle', failedDomains: [] })
    return vi.fn()
  }),
  retryFailed: vi.fn(async () => {}),
  flush: vi.fn(async () => {}),
})

describe('createAppRuntime persistence regressions', () => {
  it('keeps the selected locale visible when its storage write fails', async () => {
    const saveLocale = vi.fn(async () => {
      throw new Error('storage unavailable')
    })
    const repository = createRepository(saveLocale)
    const runtime = await createAppRuntime(repository, {
      loadMessages: vi.fn(async locale => messages(locale)),
    })

    await expect(runtime.setLocale('ja')).rejects.toThrow('storage unavailable')

    expect(runtime.store.get(localeStateAtom)).toMatchObject({
      code: 'ja',
      messages: { 'popup.theme': 'ja' },
    })
    expect(saveLocale).toHaveBeenCalledWith('ja')
    runtime.dispose()
  })

  it('keeps in-memory settings unchanged when the atomic import write fails', async () => {
    const replaceSettings = vi.fn(async () => {
      throw new Error('bulk write failed')
    })
    const repository = {
      ...createRepository(vi.fn(async () => {})),
      replaceSettings,
    }
    const runtime = await createAppRuntime(repository, {
      loadMessages: vi.fn(async locale => messages(locale)),
    })
    const previousGlobal = runtime.store.get(globalSettingsStateAtom)
    const previousChat = runtime.store.get(chatSettingsStateAtom)

    await expect(
      runtime.importSettings({
        version: 2,
        exportedAt: '2026-08-29T00:00:00.000Z',
        globalSetting: { ytdLiveChat: false, themeMode: 'dark' },
        chatSettings: {
          ...DEFAULT_CHAT_SETTINGS,
          profile: {
            ...DEFAULT_CHAT_SETTINGS.profile,
            appearance: { ...DEFAULT_CHAT_SETTINGS.profile.appearance, fontSize: 28 },
          },
        },
      }),
    ).rejects.toThrow('bulk write failed')

    expect(replaceSettings).toHaveBeenCalledOnce()
    expect(runtime.store.get(globalSettingsStateAtom)).toEqual(previousGlobal)
    expect(runtime.store.get(chatSettingsStateAtom)).toEqual(previousChat)
    runtime.dispose()
  })
})
