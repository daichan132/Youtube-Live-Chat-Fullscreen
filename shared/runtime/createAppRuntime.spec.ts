import { describe, expect, it, vi } from 'vitest'
import type { LocaleCode, LocaleMessages } from '@/shared/i18n/generated/translationTypes'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { SettingsRepository, SettingsSnapshot } from '@/shared/settings/repository'
import { localeStateAtom } from '@/shared/state/atoms'
import { createAppRuntime } from './createAppRuntime'

const messages = (value: string) => ({ 'popup.theme': value }) as unknown as LocaleMessages

describe('createAppRuntime', () => {
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
    runtime.dispose()
  })
})
