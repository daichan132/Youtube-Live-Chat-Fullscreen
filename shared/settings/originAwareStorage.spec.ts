import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from './migrateSettings'
import { createSettingsRepository, type StoredEnvelope } from './repository'
import { CHAT_STORAGE_KEY, GLOBAL_STORAGE_KEY, LOCALE_STORAGE_KEY } from './storageKeys'

const createBarrier = () => {
  let release!: () => void
  const promise = new Promise<void>(resolve => {
    release = resolve
  })
  return { promise, release }
}

describe('settings envelopes', () => {
  it('carry schema and writer identity for external-change filtering', () => {
    const envelope: StoredEnvelope<{ themeMode: 'dark' }> = { schemaVersion: 1, writerId: 'test-writer', value: { themeMode: 'dark' } }
    expect(envelope).toEqual({ schemaVersion: 1, writerId: 'test-writer', value: { themeMode: 'dark' } })
  })

  describe('settings repository migration', () => {
    beforeEach(async () => {
      localStorage.clear()
      await chrome.storage.local.remove([
        'globalSettingStore',
        'ytdLiveChatStore',
        'i18nextLng',
        GLOBAL_STORAGE_KEY,
        CHAT_STORAGE_KEY,
        LOCALE_STORAGE_KEY,
      ])
    })

    it('migrates the extension-page i18next locale before the defensive browser-storage fallback', async () => {
      localStorage.setItem('i18nextLng', 'ja')
      await chrome.storage.local.set({ i18nextLng: 'fr' })

      const snapshot = await createSettingsRepository('extension-locale-test', localStorage).load()

      expect(snapshot.locale).toBe('ja')
      expect(localStorage.getItem('i18nextLng')).toBeNull()
      expect(await chrome.storage.local.get('i18nextLng')).toEqual({})
      expect((await chrome.storage.local.get(LOCALE_STORAGE_KEY))[LOCALE_STORAGE_KEY]).toEqual({
        schemaVersion: 1,
        writerId: 'extension-locale-test',
        value: 'ja',
      })
    })

    it('preserves an explicit English legacy locale instead of replacing it with the browser UI locale', async () => {
      localStorage.setItem('i18nextLng', 'en')
      vi.spyOn(chrome.i18n, 'getUILanguage').mockReturnValue('ja')

      const snapshot = await createSettingsRepository('english-locale-test', localStorage).load()

      expect(snapshot.locale).toBe('en')
      expect(chrome.i18n.getUILanguage).not.toHaveBeenCalled()
    })

    it('gives the current locale envelope precedence over stale extension-page localStorage', async () => {
      localStorage.setItem('i18nextLng', 'ja')
      await chrome.storage.local.set({
        [GLOBAL_STORAGE_KEY]: { schemaVersion: 1, writerId: 'existing-writer', value: { ytdLiveChat: true, themeMode: 'system' } },
        [CHAT_STORAGE_KEY]: { schemaVersion: 1, writerId: 'existing-writer', value: DEFAULT_CHAT_SETTINGS },
        [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'existing-writer', value: 'fr' },
      })

      const snapshot = await createSettingsRepository('locale-precedence-test', localStorage).load()

      expect(snapshot.locale).toBe('fr')
      expect(localStorage.getItem('i18nextLng')).toBeNull()
      expect((await chrome.storage.local.get(LOCALE_STORAGE_KEY))[LOCALE_STORAGE_KEY]).toMatchObject({
        writerId: 'existing-writer',
        value: 'fr',
      })
    })

    it('defers the locale envelope outside extension pages so popup migration cannot be preempted', async () => {
      localStorage.setItem('i18nextLng', 'ja')

      const contentSnapshot = await createSettingsRepository('content-writer', null).load()

      expect(contentSnapshot.locale).toBe('en')
      expect(localStorage.getItem('i18nextLng')).toBe('ja')
      expect(await chrome.storage.local.get(LOCALE_STORAGE_KEY)).toEqual({})

      const popupSnapshot = await createSettingsRepository('popup-writer', localStorage).load()

      expect(popupSnapshot.locale).toBe('ja')
      expect(localStorage.getItem('i18nextLng')).toBeNull()
      expect((await chrome.storage.local.get(GLOBAL_STORAGE_KEY))[GLOBAL_STORAGE_KEY]).toMatchObject({
        writerId: 'content-writer',
      })
      expect((await chrome.storage.local.get(LOCALE_STORAGE_KEY))[LOCALE_STORAGE_KEY]).toMatchObject({
        writerId: 'popup-writer',
        value: 'ja',
      })
    })

    it('preserves the light theme migration for version 0 global settings', async () => {
      await chrome.storage.local.set({
        globalSettingStore: JSON.stringify({ state: { ytdLiveChat: false }, version: 0 }),
      })

      const snapshot = await createSettingsRepository('v0-theme-test').load()

      expect(snapshot.global).toEqual({ ytdLiveChat: false, themeMode: 'light' })
    })

    it('uses the system theme for missing themeMode outside the version 0 migration', async () => {
      await chrome.storage.local.set({
        globalSettingStore: JSON.stringify({ state: { ytdLiveChat: false }, version: 1 }),
      })

      const snapshot = await createSettingsRepository('current-theme-default-test').load()

      expect(snapshot.global).toEqual({ ytdLiveChat: false, themeMode: 'system' })
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

    it('preserves v6 profile, geometry, and custom presets when migrating the legacy chat store', async () => {
      await chrome.storage.local.set({
        ytdLiveChatStore: JSON.stringify({
          state: {
            fontSize: 21,
            coordinates: { x: 80, y: 90 },
            size: { width: 600, height: 500 },
            presetItemIds: ['custom'],
            presetItemTitles: { custom: '配信用' },
            presetItemStyles: { custom: { fontSize: 24 } },
          },
          version: 6,
        }),
      })

      const snapshot = await createSettingsRepository('v6-migration-test').load()

      expect(snapshot.chat.profile.appearance.fontSize).toBe(21)
      expect(snapshot.chat.geometry).toEqual({
        reference: 'legacy-viewport-px',
        coordinates: { x: 80, y: 90 },
        size: { width: 600, height: 500 },
      })
      expect(snapshot.chat.presets).toEqual([
        expect.objectContaining({
          kind: 'custom',
          id: 'custom',
          name: '配信用',
          profile: expect.objectContaining({
            appearance: expect.objectContaining({ fontSize: 24 }),
          }),
        }),
      ])

      const reloaded = await createSettingsRepository('v6-reload-test').load()
      expect(reloaded.chat).toEqual(snapshot.chat)
      expect(await chrome.storage.local.get('ytdLiveChatStore')).toEqual({})
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
        [CHAT_STORAGE_KEY]: {
          schemaVersion: 1,
          writerId: 'new-writer',
          value: {
            ...DEFAULT_CHAT_SETTINGS,
            profile: {
              ...DEFAULT_CHAT_SETTINGS.profile,
              appearance: { ...DEFAULT_CHAT_SETTINGS.profile.appearance, fontSize: 30 },
            },
          },
        },
        globalSettingStore: JSON.stringify({ state: { ytdLiveChat: true, themeMode: 'light' }, version: 1 }),
        ytdLiveChatStore: JSON.stringify({ state: { fontSize: 18 }, version: 6 }),
        i18nextLng: 'ja',
      })

      const snapshot = await createSettingsRepository('precedence-test').load()

      expect(snapshot.global).toEqual({ ytdLiveChat: false, themeMode: 'dark' })
      expect(snapshot.chat.profile.appearance.fontSize).toBe(30)
      expect(snapshot.locale).toBe('ja')
      expect(await chrome.storage.local.get(['globalSettingStore', 'ytdLiveChatStore', 'i18nextLng'])).toEqual({})

      const reloaded = await createSettingsRepository('precedence-reload-test').load()
      expect(reloaded.chat).toEqual(snapshot.chat)
    })

    it('keeps a concurrent migration that completes while another context reads legacy data', async () => {
      localStorage.setItem('i18nextLng', 'ja')
      await chrome.storage.local.set({
        globalSettingStore: JSON.stringify({ state: { ytdLiveChat: false, themeMode: 'dark' }, version: 1 }),
        ytdLiveChatStore: JSON.stringify({
          state: {
            fontSize: 23,
            coordinates: { x: 80, y: 90 },
            size: { width: 600, height: 500 },
            presetItemIds: ['custom'],
            presetItemTitles: { custom: '並行移行' },
            presetItemStyles: { custom: { fontSize: 24 } },
          },
          version: 6,
        }),
      })
      const legacyReadStarted = createBarrier()
      const releaseLegacyRead = createBarrier()
      const originalGet = chrome.storage.local.get.bind(chrome.storage.local)
      let blockedFirstLegacyRead = false
      const interceptGet = async (keys?: string | string[] | Record<string, unknown> | null) => {
        if (!blockedFirstLegacyRead && Array.isArray(keys) && keys.includes('globalSettingStore')) {
          blockedFirstLegacyRead = true
          legacyReadStarted.release()
          await releaseLegacyRead.promise
        }
        return (originalGet as (storageKeys?: typeof keys) => Promise<Record<string, unknown>>)(keys)
      }
      vi.spyOn(chrome.storage.local, 'get').mockImplementation(interceptGet as typeof chrome.storage.local.get)

      const racedLoad = createSettingsRepository('raced-writer', localStorage).load()
      await legacyReadStarted.promise
      const winningSnapshot = await createSettingsRepository('winning-writer', localStorage).load()
      releaseLegacyRead.release()
      const racedSnapshot = await racedLoad

      expect(winningSnapshot.global).toEqual({ ytdLiveChat: false, themeMode: 'dark' })
      expect(winningSnapshot.chat.profile.appearance.fontSize).toBe(23)
      expect(winningSnapshot.chat.geometry).toEqual({
        reference: 'legacy-viewport-px',
        coordinates: { x: 80, y: 90 },
        size: { width: 600, height: 500 },
      })
      expect(winningSnapshot.chat.presets).toEqual([
        expect.objectContaining({
          id: 'custom',
          name: '並行移行',
          profile: expect.objectContaining({
            appearance: expect.objectContaining({ fontSize: 24 }),
          }),
        }),
      ])
      expect(winningSnapshot.locale).toBe('ja')
      expect(racedSnapshot).toEqual(winningSnapshot)
      expect((await chrome.storage.local.get(GLOBAL_STORAGE_KEY))[GLOBAL_STORAGE_KEY]).toMatchObject({
        writerId: 'winning-writer',
        value: winningSnapshot.global,
      })
      expect((await chrome.storage.local.get(CHAT_STORAGE_KEY))[CHAT_STORAGE_KEY]).toMatchObject({
        writerId: 'winning-writer',
        value: winningSnapshot.chat,
      })
      expect((await chrome.storage.local.get(LOCALE_STORAGE_KEY))[LOCALE_STORAGE_KEY]).toMatchObject({
        writerId: 'winning-writer',
        value: 'ja',
      })
    })

    it('prefers valid v6 chat data over a malformed current chat envelope', async () => {
      await chrome.storage.local.set({
        [CHAT_STORAGE_KEY]: {
          schemaVersion: 1,
          writerId: 'broken-writer',
          value: { profile: {}, geometry: {}, presets: [] },
        },
        ytdLiveChatStore: JSON.stringify({
          state: {
            fontSize: 22,
            coordinates: { x: 70, y: 80 },
            size: { width: 620, height: 510 },
            presetItemIds: ['custom'],
            presetItemTitles: { custom: '復元用' },
            presetItemStyles: { custom: { fontSize: 25 } },
          },
          version: 6,
        }),
      })

      const snapshot = await createSettingsRepository('malformed-envelope-test').load()

      expect(snapshot.chat.profile.appearance.fontSize).toBe(22)
      expect(snapshot.chat.geometry).toEqual({
        reference: 'legacy-viewport-px',
        coordinates: { x: 70, y: 80 },
        size: { width: 620, height: 510 },
      })
      expect(snapshot.chat.presets).toEqual([
        expect.objectContaining({
          kind: 'custom',
          id: 'custom',
          name: '復元用',
          profile: expect.objectContaining({
            appearance: expect.objectContaining({ fontSize: 25 }),
          }),
        }),
      ])

      expect((await chrome.storage.local.get(CHAT_STORAGE_KEY))[CHAT_STORAGE_KEY]).toMatchObject({
        schemaVersion: 1,
        writerId: 'malformed-envelope-test',
      })
      const reloaded = await createSettingsRepository('malformed-envelope-reload-test').load()
      expect(reloaded.chat).toEqual(snapshot.chat)
      expect(await chrome.storage.local.get('ytdLiveChatStore')).toEqual({})
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
      const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
      const originalRemove = chrome.storage.local.remove.bind(chrome.storage.local)
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

    it('keeps the extension-page locale until its new envelope can be read back', async () => {
      localStorage.setItem('i18nextLng', 'ja')
      const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
      const originalRemove = chrome.storage.local.remove.bind(chrome.storage.local)
      vi.spyOn(chrome.storage.local, 'set').mockImplementation(async values => {
        await originalSet(values)
        if (LOCALE_STORAGE_KEY in values) await originalRemove(LOCALE_STORAGE_KEY)
      })

      await createSettingsRepository('locale-readback-test', localStorage).load()

      expect(localStorage.getItem('i18nextLng')).toBe('ja')
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
      const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
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
