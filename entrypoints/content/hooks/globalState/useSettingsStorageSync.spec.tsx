import { describe, expect, it, vi } from 'vitest'
import { createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { PersistenceStatus, SettingsRepository } from '@/shared/settings/repository'
import { chatSettingsStateAtom, editorSessionStateAtom, globalSettingsStateAtom } from '@/shared/state/atoms'

vi.mock('@/shared/i18n/loader', () => ({
  loadLocaleMessages: vi.fn(async () => ({})),
}))

const createRepository = (overrides: Partial<SettingsRepository> = {}): SettingsRepository => ({
  load: async () => ({ global: { ytdLiveChat: true, themeMode: 'system' }, chat: DEFAULT_CHAT_SETTINGS, locale: 'en' }),
  saveEnabled: async () => {},
  saveTheme: async () => {},
  saveAppearance: async () => {},
  saveGeometry: async () => {},
  saveLocale: async () => {},
  replaceSettings: async () => {},
  watch: () => () => {},
  getPersistenceStatus: (): PersistenceStatus => ({ status: 'idle', failedDomains: [] }),
  subscribePersistence: listener => {
    listener({ status: 'idle', failedDomains: [] })
    return () => {}
  },
  retryFailed: async () => {},
  flush: async () => {},
  ...overrides,
})

describe('AppRuntime settings ownership', () => {
  it('persists local atom changes and applies external updates without echoing them', async () => {
    let externalHandlers: Parameters<SettingsRepository['watch']>[0] | undefined
    const saveTheme = vi.fn(async () => {})
    const repository = createRepository({
      saveTheme,
      watch: handlers => {
        externalHandlers = handlers
        return () => {}
      },
    })

    const runtime = await createAppRuntime(repository)
    runtime.store.set(globalSettingsStateAtom, { ytdLiveChat: true, themeMode: 'dark' })
    expect(saveTheme).toHaveBeenCalledWith('dark')

    saveTheme.mockClear()
    externalHandlers?.onEnabled(false)
    externalHandlers?.onTheme('light')
    expect(runtime.store.get(globalSettingsStateAtom)).toEqual({ ytdLiveChat: false, themeMode: 'light' })
    expect(saveTheme).not.toHaveBeenCalled()
    runtime.dispose()
  })

  it('discards an active draft for an external profile change', async () => {
    let externalHandlers: Parameters<SettingsRepository['watch']>[0] | undefined
    const repository = createRepository({
      watch: handlers => {
        externalHandlers = handlers
        return () => {}
      },
    })
    const runtime = await createAppRuntime(repository)
    const previous = runtime.store.get(chatSettingsStateAtom).profile
    runtime.store.set(editorSessionStateAtom, {
      draftProfile: { ...previous, appearance: { ...previous.appearance, blur: 10 } },
      past: [previous],
      future: [],
      activeGesture: { id: 'blur', before: previous },
    })
    externalHandlers?.onAppearance({
      profile: { ...previous, appearance: { ...previous.appearance, blur: 14 } },
      presets: DEFAULT_CHAT_SETTINGS.presets,
    })
    expect(runtime.store.get(editorSessionStateAtom)).toEqual({ draftProfile: null, past: [], future: [], activeGesture: null })
    runtime.dispose()
  })

  it('keeps history for an external geometry-only change', async () => {
    let externalHandlers: Parameters<SettingsRepository['watch']>[0] | undefined
    const repository = createRepository({
      watch: handlers => {
        externalHandlers = handlers
        return () => {}
      },
    })
    const runtime = await createAppRuntime(repository)
    const profile = runtime.store.get(chatSettingsStateAtom).profile
    runtime.store.set(editorSessionStateAtom, { draftProfile: null, past: [profile], future: [], activeGesture: null })
    externalHandlers?.onGeometry({
      reference: 'legacy-viewport-px',
      coordinates: { x: 1000, y: 700 },
      size: { width: 800, height: 600 },
    })
    expect(runtime.store.get(chatSettingsStateAtom).geometry).toMatchObject({ coordinates: { x: 1000, y: 700 } })
    expect(runtime.store.get(editorSessionStateAtom).past).toHaveLength(1)
    runtime.dispose()
  })

  it('delegates the pending-write barrier to the bulk replacement operation', async () => {
    let replaced: { global: unknown; chat: unknown } | null = null
    const flush = vi.fn(async () => {})
    const replaceSettings = vi.fn(async (global, chat) => {
      replaced = { global, chat }
    })
    const repository = createRepository({ flush, replaceSettings })
    const runtime = await createAppRuntime(repository)

    await runtime.importSettings({
      version: 1,
      exportedAt: '',
      globalSetting: { themeMode: 'dark', ytdLiveChat: false },
      ytdLiveChat: { fontSize: 42 },
    })

    expect(flush).not.toHaveBeenCalled()
    expect(replaceSettings).toHaveBeenCalledOnce()
    expect(replaced).not.toBeNull()
    const imported = replaced as unknown as { global: unknown; chat: typeof DEFAULT_CHAT_SETTINGS }
    expect(imported.global).toEqual({ ytdLiveChat: false, themeMode: 'dark' })
    expect(imported.chat.profile.appearance.fontSize).toBe(40)
    runtime.dispose()
  })
})
