import { describe, expect, it, vi } from 'vitest'
import type { LocaleMessages } from '@/shared/i18n/generated/translationTypes'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { PersistenceStatus, SettingsRepository, SettingsSnapshot } from '@/shared/settings/repository'
import { createAppRuntime } from './createAppRuntime'

const snapshot: SettingsSnapshot = {
  global: { ytdLiveChat: true, themeMode: 'system' },
  chat: structuredClone(DEFAULT_CHAT_SETTINGS),
  locale: 'en',
}

const createRepository = (): SettingsRepository => ({
  load: vi.fn(async () => snapshot),
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
})

describe('createAppRuntime settings import ownership', () => {
  it('delegates the import barrier to replaceSettings instead of flushing twice', async () => {
    const repository = createRepository()
    const loadMessages = vi.fn(async () => ({}) as LocaleMessages)
    const runtime = await createAppRuntime(repository, { loadMessages })

    await runtime.importSettings(runtime.exportSettings())

    expect(repository.flush).not.toHaveBeenCalled()
    expect(repository.replaceSettings).toHaveBeenCalledOnce()
    runtime.dispose()
  })
})
