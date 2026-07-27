import { describe, expect, it, vi } from 'vitest'
import { createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { SettingsRepository } from '@/shared/settings/repository'
import { chatSettingsStateAtom, editorSessionStateAtom, globalSettingsStateAtom } from '@/shared/state/atoms'

vi.mock('@/shared/i18n/loader', () => ({
  loadLocaleMessages: vi.fn(async () => ({})),
}))

describe('AppRuntime settings ownership', () => {
  it('persists local atom changes and applies external updates without echoing them', async () => {
    let externalHandlers: Parameters<SettingsRepository['watch']>[0] | undefined
    const saveGlobal = vi.fn(async () => {})
    const repository: SettingsRepository = {
      load: async () => ({ global: { ytdLiveChat: true, themeMode: 'system' }, chat: DEFAULT_CHAT_SETTINGS, locale: 'en' }),
      saveGlobal,
      saveChat: async () => {},
      saveLocale: async () => {},
      replaceSettings: async () => {},
      watch: handlers => {
        externalHandlers = handlers
        return () => {}
      },
      flush: async () => {},
    }

    const runtime = await createAppRuntime(repository)
    runtime.store.set(globalSettingsStateAtom, { ytdLiveChat: true, themeMode: 'dark' })
    expect(saveGlobal).toHaveBeenCalledWith({ ytdLiveChat: true, themeMode: 'dark' })

    saveGlobal.mockClear()
    externalHandlers?.onGlobal({ ytdLiveChat: false, themeMode: 'light' })
    expect(runtime.store.get(globalSettingsStateAtom)).toEqual({ ytdLiveChat: false, themeMode: 'light' })
    expect(saveGlobal).not.toHaveBeenCalled()
    runtime.dispose()
  })

  it('discards an active draft for an external profile change', async () => {
    let externalHandlers: Parameters<SettingsRepository['watch']>[0] | undefined
    const repository: SettingsRepository = {
      load: async () => ({ global: { ytdLiveChat: true, themeMode: 'system' }, chat: DEFAULT_CHAT_SETTINGS, locale: 'en' }),
      saveGlobal: async () => {},
      saveChat: async () => {},
      saveLocale: async () => {},
      replaceSettings: async () => {},
      watch: handlers => {
        externalHandlers = handlers
        return () => {}
      },
      flush: async () => {},
    }
    const runtime = await createAppRuntime(repository)
    const previous = runtime.store.get(chatSettingsStateAtom).profile
    runtime.store.set(editorSessionStateAtom, {
      draftProfile: { ...previous, appearance: { ...previous.appearance, blur: 10 } },
      past: [previous],
      future: [],
      activeGesture: { id: 'blur', before: previous },
    })
    externalHandlers?.onChat({
      ...DEFAULT_CHAT_SETTINGS,
      profile: { ...previous, appearance: { ...previous.appearance, blur: 14 } },
    })
    expect(runtime.store.get(editorSessionStateAtom)).toEqual({ draftProfile: null, past: [], future: [], activeGesture: null })
    runtime.dispose()
  })

  it('keeps history for an external geometry-only change', async () => {
    let externalHandlers: Parameters<SettingsRepository['watch']>[0] | undefined
    const repository: SettingsRepository = {
      load: async () => ({ global: { ytdLiveChat: true, themeMode: 'system' }, chat: DEFAULT_CHAT_SETTINGS, locale: 'en' }),
      saveGlobal: async () => {},
      saveChat: async () => {},
      saveLocale: async () => {},
      replaceSettings: async () => {},
      watch: handlers => {
        externalHandlers = handlers
        return () => {}
      },
      flush: async () => {},
    }
    const runtime = await createAppRuntime(repository)
    const profile = runtime.store.get(chatSettingsStateAtom).profile
    runtime.store.set(editorSessionStateAtom, { draftProfile: null, past: [profile], future: [], activeGesture: null })
    externalHandlers?.onChat({
      ...DEFAULT_CHAT_SETTINGS,
      geometry: { coordinates: { x: 1000, y: 700 }, size: { width: 800, height: 600 } },
    })
    expect(runtime.store.get(chatSettingsStateAtom).geometry.coordinates).toEqual({ x: 1000, y: 700 })
    expect(runtime.store.get(editorSessionStateAtom).past).toHaveLength(1)
    runtime.dispose()
  })

  it('flushes pending writes before bulk import replaces settings', async () => {
    const order: string[] = []
    let replaced: { global: unknown; chat: unknown } | null = null
    const repository: SettingsRepository = {
      load: async () => ({ global: { ytdLiveChat: true, themeMode: 'system' }, chat: DEFAULT_CHAT_SETTINGS, locale: 'en' }),
      saveGlobal: async () => {},
      saveChat: async () => {},
      saveLocale: async () => {},
      replaceSettings: async (global, chat) => {
        order.push('replace')
        replaced = { global, chat }
      },
      watch: () => () => {},
      flush: async () => {
        order.push('flush')
      },
    }
    const runtime = await createAppRuntime(repository)
    await runtime.importSettings({
      version: 1,
      exportedAt: '',
      globalSetting: { themeMode: 'dark', ytdLiveChat: false },
      ytdLiveChat: { fontSize: 42 },
    })
    expect(order).toEqual(['flush', 'replace'])
    expect(replaced).not.toBeNull()
    const imported = replaced as unknown as { global: unknown; chat: typeof DEFAULT_CHAT_SETTINGS }
    expect(imported.global).toEqual({ ytdLiveChat: false, themeMode: 'dark' })
    expect(imported.chat.profile.appearance.fontSize).toBe(40)
    runtime.dispose()
  })
})
