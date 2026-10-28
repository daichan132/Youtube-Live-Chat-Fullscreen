import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { createSettingsRepository, type SettingsRepository } from '@/shared/settings/repository'
import { chatSettingsStateAtom, EMPTY_MESSAGES, localeStateAtom, persistenceStatusAtom } from '@/shared/state/atoms'
import {
  commitGeometryAtom,
  commitStylePatchAtom,
  deletePresetAtom,
  reorderPresetsAtom,
  resetGeometryAtom,
  setThemeModeAtom,
  setYTDLiveChatEnabledAtom,
  updatePresetNameAtom,
} from '@/shared/state/commands'
import { type AppRuntime, createAppRuntime } from './createAppRuntime'

const sessions: { runtime: AppRuntime; repository: SettingsRepository }[] = []

const openSettings = async (writerId = 'settings-editor') => {
  const repository = createSettingsRepository(writerId, null, { waitBeforeRetry: async () => {} })
  const runtime = await createAppRuntime(repository, {
    loadMessages: async locale => ({ ...EMPTY_MESSAGES, 'popup.theme': locale }),
  })
  const session = { runtime, repository }
  sessions.push(session)
  return session
}

const envelope = <T>(value: T) => ({ schemaVersion: 1, writerId: 'existing-context', value })
const geometry = { reference: 'player' as const, rect: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 }, pinned: true }
const initialStorage = () => ({
  'ylc-enabled': envelope(true),
  'ylc-theme': envelope('system'),
  'ylc-chat-appearance': envelope({ profile: structuredClone(DEFAULT_CHAT_SETTINGS.profile), presets: [] }),
  'ylc-chat-geometry': envelope(geometry),
  'ylc-locale': envelope('en'),
})

beforeEach(async () => {
  await chrome.storage.local.clear()
  await chrome.storage.local.set(initialStorage())
})

afterEach(async () => {
  // A failure must not leave a real repository listening to the next test's Storage.
  vi.restoreAllMocks()
  await Promise.allSettled(sessions.map(({ repository }) => repository.flush()))
  for (const { runtime } of sessions.splice(0)) runtime.dispose()
})

describe('settings persistence through the app runtime', () => {
  it('does not rewrite saved domains for edits that leave their values unchanged', async () => {
    const preset = { kind: 'custom', id: 'saved', name: 'Saved', profile: structuredClone(DEFAULT_CHAT_SETTINGS.profile) }
    await chrome.storage.local.set({
      'ylc-chat-appearance': envelope({ profile: structuredClone(DEFAULT_CHAT_SETTINGS.profile), presets: [preset] }),
      'ylc-chat-geometry': envelope(structuredClone(DEFAULT_CHAT_SETTINGS.geometry)),
    })
    const before = await chrome.storage.local.get(null)
    const { runtime, repository } = await openSettings()
    const state = runtime.store.get(chatSettingsStateAtom)

    runtime.store.set(setYTDLiveChatEnabledAtom, true)
    runtime.store.set(setThemeModeAtom, 'system')
    runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 13 } })
    runtime.store.set(commitGeometryAtom, state.geometry)
    runtime.store.set(resetGeometryAtom)
    runtime.store.set(deletePresetAtom, 'missing')
    runtime.store.set(reorderPresetsAtom, ['saved'])
    runtime.store.set(updatePresetNameAtom, { id: 'saved', name: 'Saved' })
    await repository.flush()

    expect(await chrome.storage.local.get(null)).toEqual(before)
    expect(runtime.exportSettings()).toMatchObject({ chatSettings: { presets: [preset], geometry: DEFAULT_CHAT_SETTINGS.geometry } })
  })

  it.each(['enabled', 'theme', 'appearance', 'geometry'] as const)(
    'saves only the edited %s domain and restores it on reopening',
    async domain => {
      const before = initialStorage()
      const { runtime, repository } = await openSettings()
      let editedKey: keyof typeof before
      let editedValue: unknown
      if (domain === 'enabled') {
        runtime.store.set(setYTDLiveChatEnabledAtom, false)
        editedKey = 'ylc-enabled'
        editedValue = false
      } else if (domain === 'theme') {
        runtime.store.set(setThemeModeAtom, 'dark')
        editedKey = 'ylc-theme'
        editedValue = 'dark'
      } else if (domain === 'appearance') {
        runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 27 } })
        editedKey = 'ylc-chat-appearance'
        editedValue = {
          profile: {
            ...before['ylc-chat-appearance'].value.profile,
            appearance: { ...before['ylc-chat-appearance'].value.profile.appearance, fontSize: 27 },
          },
          presets: [],
        }
      } else {
        runtime.store.set(commitGeometryAtom, { ...geometry, rect: { x: 0.4, y: 0.2, width: 0.2, height: 0.5 } })
        editedKey = 'ylc-chat-geometry'
        editedValue = { reference: 'player', rect: { x: 0.4, y: 0.2, width: 0.2, height: 0.5 }, pinned: true }
      }
      await repository.flush()

      // Compare the whole persisted snapshot, including untouched writer IDs.
      // A spy on saveAppearance alone cannot catch a wrong key or a broad rewrite.
      expect(await chrome.storage.local.get(null)).toEqual({
        ...before,
        [editedKey]: { schemaVersion: 1, writerId: 'settings-editor', value: editedValue },
      })
      runtime.dispose()
      const reopened = await openSettings('reopened-page')
      expect(reopened.runtime.exportSettings()).toMatchObject({
        globalSetting: { ytdLiveChat: domain !== 'enabled', themeMode: domain === 'theme' ? 'dark' : 'system' },
        chatSettings: {
          profile: { appearance: { fontSize: domain === 'appearance' ? 27 : 13 } },
          presets: [],
          geometry: domain === 'geometry' ? editedValue : geometry,
        },
      })
    },
  )

  it('keeps an unsaved language visible, reports its failure, and persists it after Retry', async () => {
    const { runtime, repository } = await openSettings()
    const unavailable = vi.spyOn(chrome.storage.local, 'set').mockRejectedValue(new Error('storage unavailable'))

    await expect(runtime.setLocale('ja')).rejects.toThrow('storage unavailable')

    expect(runtime.store.get(localeStateAtom)).toMatchObject({ code: 'ja', messages: { 'popup.theme': 'ja' } })
    expect(runtime.store.get(persistenceStatusAtom)).toEqual({ status: 'error', failedDomains: ['locale'] })
    expect(await chrome.storage.local.get('ylc-locale')).toEqual({ 'ylc-locale': envelope('en') })
    await expect(repository.flush()).rejects.toThrow('storage unavailable')

    unavailable.mockRestore()
    await runtime.retryPersistence()
    expect(runtime.store.get(persistenceStatusAtom)).toEqual({ status: 'idle', failedDomains: [] })
    await repository.flush()
    expect(await chrome.storage.local.get('ylc-locale')).toEqual({
      'ylc-locale': { schemaVersion: 1, writerId: 'settings-editor', value: 'ja' },
    })
    runtime.dispose()
    const reopened = await openSettings('reopened-page')
    expect(reopened.runtime.store.get(localeStateAtom)).toMatchObject({ code: 'ja', messages: { 'popup.theme': 'ja' } })
  })

  it('preserves saved settings when an import write fails and accepts the next valid import', async () => {
    const { runtime } = await openSettings()
    const previous = runtime.exportSettings()
    const backup = {
      ...previous,
      globalSetting: { ytdLiveChat: false, themeMode: 'dark' },
      chatSettings: {
        ...previous.chatSettings,
        profile: { ...previous.chatSettings.profile, appearance: { ...previous.chatSettings.profile.appearance, fontSize: 28 } },
      },
    }
    const unavailable = vi.spyOn(chrome.storage.local, 'set').mockRejectedValue(new Error('bulk write failed'))

    await expect(runtime.importSettings(backup)).rejects.toMatchObject({ phase: 'write' })

    expect(runtime.exportSettings()).toMatchObject({ globalSetting: previous.globalSetting, chatSettings: previous.chatSettings })
    expect(await chrome.storage.local.get(null)).toEqual(initialStorage())
    unavailable.mockRestore()

    await runtime.importSettings(backup)

    expect(runtime.exportSettings()).toMatchObject({ globalSetting: backup.globalSetting, chatSettings: backup.chatSettings })
    expect(await chrome.storage.local.get(null)).toMatchObject({
      'ylc-enabled': { writerId: 'settings-editor', value: false },
      'ylc-theme': { writerId: 'settings-editor', value: 'dark' },
      'ylc-chat-appearance': { writerId: 'settings-editor', value: { profile: { appearance: { fontSize: 28 } }, presets: [] } },
      'ylc-chat-geometry': { writerId: 'settings-editor', value: geometry },
      'ylc-locale': envelope('en'),
    })
    runtime.dispose()
    const reopened = await openSettings('reopened-page')
    expect(reopened.runtime.exportSettings()).toMatchObject({ globalSetting: backup.globalSetting, chatSettings: backup.chatSettings })
  })
})
