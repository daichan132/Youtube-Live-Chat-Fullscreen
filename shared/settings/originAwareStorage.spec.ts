import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from './migrateSettings'
import { createSettingsRepository, type StoredEnvelope } from './repository'
import { CHAT_STORAGE_KEY, GLOBAL_STORAGE_KEY, LOCALE_STORAGE_KEY } from './storageKeys'

describe('settings envelopes', () => {
  it('carry schema and writer identity for external-change filtering', () => {
    const envelope: StoredEnvelope<{ themeMode: 'dark' }> = { schemaVersion: 1, writerId: 'test-writer', value: { themeMode: 'dark' } }
    expect(envelope).toEqual({ schemaVersion: 1, writerId: 'test-writer', value: { themeMode: 'dark' } })
  })

  describe('settings repository migration', () => {
    beforeEach(async () => {
      await chrome.storage.local.remove([
        'globalSettingStore',
        'ytdLiveChatStore',
        'i18nextLng',
        GLOBAL_STORAGE_KEY,
        CHAT_STORAGE_KEY,
        LOCALE_STORAGE_KEY,
      ])
    })

    it('migrates the legacy stores into the WXT storage envelope and removes legacy keys', async () => {
      await chrome.storage.local.set({
        globalSettingStore: JSON.stringify({ state: { ytdLiveChat: false, themeMode: 'dark' }, version: 1 }),
        ytdLiveChatStore: JSON.stringify({
          state: {
            ...DEFAULT_CHAT_SETTINGS,
            profile: { ...DEFAULT_CHAT_SETTINGS.profile, appearance: { ...DEFAULT_CHAT_SETTINGS.profile.appearance, fontSize: 42 } },
          },
          version: 7,
        }),
        i18nextLng: 'ja',
      })

      const repository = createSettingsRepository('migration-test')
      const snapshot = await repository.load()

      expect(snapshot.global).toEqual({ ytdLiveChat: false, themeMode: 'dark' })
      expect(snapshot.chat.profile.appearance.fontSize).toBe(40)
      expect(snapshot.locale).toBe('ja')
      expect(await chrome.storage.local.get(['globalSettingStore', 'ytdLiveChatStore', 'i18nextLng'])).toEqual({})
      expect((await chrome.storage.local.get(CHAT_STORAGE_KEY))[CHAT_STORAGE_KEY]).toMatchObject({
        schemaVersion: 1,
        writerId: 'migration-test',
      })
    })

    it('loads current envelopes without rewriting them', async () => {
      const current: StoredEnvelope<typeof DEFAULT_CHAT_SETTINGS> = {
        schemaVersion: 1,
        writerId: 'existing-writer',
        value: DEFAULT_CHAT_SETTINGS,
      }
      await chrome.storage.local.set({
        [GLOBAL_STORAGE_KEY]: { schemaVersion: 1, writerId: 'existing-writer', value: { ytdLiveChat: true, themeMode: 'light' } },
        [CHAT_STORAGE_KEY]: current,
        [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'existing-writer', value: 'en' },
      })

      const snapshot = await createSettingsRepository('reader-test').load()

      expect(snapshot.global.themeMode).toBe('light')
      expect((await chrome.storage.local.get(GLOBAL_STORAGE_KEY))[GLOBAL_STORAGE_KEY]).toEqual({
        schemaVersion: 1,
        writerId: 'existing-writer',
        value: { ytdLiveChat: true, themeMode: 'light' },
      })
    })

    it('gives valid new envelopes precedence over legacy values while filling missing entries', async () => {
      await chrome.storage.local.set({
        [GLOBAL_STORAGE_KEY]: {
          schemaVersion: 1,
          writerId: 'new-writer',
          value: { ytdLiveChat: false, themeMode: 'dark' },
        },
        globalSettingStore: JSON.stringify({ state: { ytdLiveChat: true, themeMode: 'light' }, version: 1 }),
        ytdLiveChatStore: JSON.stringify({ state: DEFAULT_CHAT_SETTINGS, version: 7 }),
        i18nextLng: 'ja',
      })

      const snapshot = await createSettingsRepository('precedence-test').load()

      expect(snapshot.global).toEqual({ ytdLiveChat: false, themeMode: 'dark' })
      expect(snapshot.chat).toEqual(DEFAULT_CHAT_SETTINGS)
      expect(snapshot.locale).toBe('ja')
      expect(await chrome.storage.local.get(['globalSettingStore', 'ytdLiveChatStore', 'i18nextLng'])).toEqual({})
    })

    it('falls back from broken legacy JSON and missing values without throwing', async () => {
      await chrome.storage.local.set({
        globalSettingStore: '{broken',
        ytdLiveChatStore: JSON.stringify({ state: { profile: {} }, version: 7 }),
      })

      const snapshot = await createSettingsRepository('broken-legacy-test').load()

      expect(snapshot.global).toEqual({ ytdLiveChat: true, themeMode: 'system' })
      expect(snapshot.chat).toEqual(DEFAULT_CHAT_SETTINGS)
      expect(snapshot.locale).toBe('en')
      expect(await chrome.storage.local.get(['globalSettingStore', 'ytdLiveChatStore', 'i18nextLng'])).toEqual({})
    })

    it('keeps legacy data when the new envelope cannot be read back', async () => {
      await chrome.storage.local.set({
        globalSettingStore: JSON.stringify({ state: { themeMode: 'dark' }, version: 1 }),
        ytdLiveChatStore: JSON.stringify({ state: DEFAULT_CHAT_SETTINGS, version: 7 }),
        i18nextLng: 'ja',
      })
      const originalSetImplementation = vi.mocked(chrome.storage.local.set).getMockImplementation()
      const originalRemoveImplementation = vi.mocked(chrome.storage.local.remove).getMockImplementation()
      if (!originalSetImplementation || !originalRemoveImplementation) throw new Error('storage mocks are not initialized')
      const originalSet = originalSetImplementation as unknown as (values: Record<string, unknown>) => Promise<void>
      const originalRemove = originalRemoveImplementation as unknown as (keys: string | string[]) => Promise<void>
      vi.spyOn(chrome.storage.local, 'set').mockImplementation(async values => {
        await originalSet(values)
        if (GLOBAL_STORAGE_KEY in values) await originalRemove(GLOBAL_STORAGE_KEY)
      })

      await createSettingsRepository('readback-test').load()

      expect(await chrome.storage.local.get(['globalSettingStore', 'ytdLiveChatStore', 'i18nextLng'])).toMatchObject({
        globalSettingStore: expect.any(String),
        ytdLiveChatStore: expect.any(String),
        i18nextLng: 'ja',
      })
    })

    it('ignores self-written events and forwards external envelope changes', async () => {
      const onGlobal = vi.fn()
      const repository = createSettingsRepository('self-writer')
      const unwatch = repository.watch({ onGlobal, onChat: vi.fn(), onLocale: vi.fn() })

      await repository.saveGlobal({ ytdLiveChat: true, themeMode: 'dark' })
      expect(onGlobal).not.toHaveBeenCalled()
      await chrome.storage.local.set({
        [GLOBAL_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-writer', value: { ytdLiveChat: false, themeMode: 'light' } },
      })
      expect(onGlobal).toHaveBeenCalledWith({ ytdLiveChat: false, themeMode: 'light' })
      unwatch()
    })

    it('serializes bulk writes before flush resolves', async () => {
      const repository = createSettingsRepository('queue-test')
      const writes: string[] = []
      const originalSetImplementation = vi.mocked(chrome.storage.local.set).getMockImplementation()
      if (!originalSetImplementation) throw new Error('storage mock is not initialized')
      const originalSet = originalSetImplementation as unknown as (values: Record<string, unknown>) => Promise<void>
      vi.spyOn(chrome.storage.local, 'set').mockImplementation(async values => {
        writes.push(...Object.keys(values))
        await originalSet(values)
      })

      await Promise.all([
        repository.saveGlobal({ ytdLiveChat: false, themeMode: 'dark' }),
        repository.saveChat(DEFAULT_CHAT_SETTINGS),
        repository.saveLocale('ja'),
      ])
      await repository.flush()

      expect(writes).toEqual([GLOBAL_STORAGE_KEY, CHAT_STORAGE_KEY, LOCALE_STORAGE_KEY])
    })
  })
})
