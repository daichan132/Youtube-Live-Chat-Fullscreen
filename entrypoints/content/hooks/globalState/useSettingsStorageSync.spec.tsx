import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatEditorStore } from '@/entrypoints/content/settings/ChatEditorStore'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { SETTINGS_STORAGE_ORIGIN_ID } from '@/shared/settings/originAwareStorage'
import { YTD_LIVE_CHAT_PERSIST } from '@/shared/settings/persistConfig'
import { useGlobalSettingStore } from '@/shared/stores/globalSettingStore'
import { useSettingsStorageSync } from './useSettingsStorageSync'

type StorageListener = (changes: Record<string, unknown>, areaName: string) => void

const storageListeners = vi.hoisted(() => new Set<StorageListener>())
const onChanged = vi.hoisted(() => ({
  addListener: vi.fn((listener: StorageListener) => storageListeners.add(listener)),
  removeListener: vi.fn((listener: StorageListener) => storageListeners.delete(listener)),
}))

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      onChanged,
    },
  },
}))

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

const emitStorageChange = (changes: Record<string, unknown>, areaName = 'local') => {
  for (const listener of storageListeners) listener(changes, areaName)
}

const serializeChatSettings = (originId?: string) =>
  JSON.stringify({
    state: {
      profile: useChatSettingsStore.getState().profile,
      geometry: useChatSettingsStore.getState().geometry,
      presets: useChatSettingsStore.getState().presets,
    },
    version: YTD_LIVE_CHAT_PERSIST.version,
    ...(originId ? { originId } : {}),
  })

describe('useSettingsStorageSync', () => {
  beforeEach(() => {
    storageListeners.clear()
    onChanged.addListener.mockClear()
    onChanged.removeListener.mockClear()
    useChatEditorStore.getState().clear()
    vi.spyOn(useGlobalSettingStore.persist, 'rehydrate').mockResolvedValue(undefined)
    vi.spyOn(useChatSettingsStore.persist, 'rehydrate').mockResolvedValue(undefined)
  })

  it('rehydrates external global and chat settings and clears history when the profile changed', async () => {
    const previous = useChatSettingsStore.getState().profile
    useChatEditorStore.setState({ past: [previous] })
    vi.mocked(useChatSettingsStore.persist.rehydrate).mockImplementationOnce(async () => {
      useChatSettingsStore.setState({
        profile: {
          ...previous,
          appearance: {
            ...previous.appearance,
            fontSize: previous.appearance.fontSize + 1,
          },
        },
      })
    })
    renderHook(() => useSettingsStorageSync())

    act(() => {
      emitStorageChange({
        globalSettingStore: {},
        ytdLiveChatStore: {
          newValue: serializeChatSettings(),
        },
      })
    })

    await waitFor(() => {
      expect(useGlobalSettingStore.persist.rehydrate).toHaveBeenCalledTimes(1)
      expect(useChatSettingsStore.persist.rehydrate).toHaveBeenCalledTimes(1)
      expect(useChatEditorStore.getState().past).toEqual([])
    })
  })

  it('discards an active draft for an external chat settings change', async () => {
    const profile = useChatSettingsStore.getState().profile
    useChatEditorStore.setState({
      draftProfile: {
        ...profile,
        appearance: { ...profile.appearance, blur: 10 },
      },
      activeGesture: { id: 'blur', before: profile },
    })
    renderHook(() => useSettingsStorageSync())

    act(() => {
      emitStorageChange({
        ytdLiveChatStore: {
          newValue: serializeChatSettings('another-context'),
        },
      })
    })

    await waitFor(() => {
      expect(useChatSettingsStore.persist.rehydrate).toHaveBeenCalledTimes(1)
      expect(useChatEditorStore.getState().draftProfile).toBeNull()
      expect(useChatEditorStore.getState().activeGesture).toBeNull()
    })
  })

  it('ignores its own persisted state', async () => {
    renderHook(() => useSettingsStorageSync())

    act(() => {
      emitStorageChange({
        ytdLiveChatStore: {
          newValue: serializeChatSettings(SETTINGS_STORAGE_ORIGIN_ID),
        },
      })
    })

    await waitFor(() => {
      expect(useChatSettingsStore.persist.rehydrate).not.toHaveBeenCalled()
    })
  })

  it('does not clear history for an external geometry-only change', async () => {
    const profile = useChatSettingsStore.getState().profile
    useChatEditorStore.setState({ past: [profile] })
    vi.mocked(useChatSettingsStore.persist.rehydrate).mockImplementationOnce(async () => {
      useChatSettingsStore.setState({
        geometry: {
          coordinates: { x: 1_000, y: 700 },
          size: { width: 800, height: 600 },
        },
      })
    })
    renderHook(() => useSettingsStorageSync())

    act(() => {
      emitStorageChange({
        ytdLiveChatStore: {
          newValue: serializeChatSettings('another-context'),
        },
      })
    })

    await waitFor(() => {
      expect(useChatSettingsStore.persist.rehydrate).toHaveBeenCalledTimes(1)
    })
    expect(useChatSettingsStore.getState().geometry.coordinates).toEqual({ x: 1_000, y: 700 })
    expect(useChatEditorStore.getState().past).toHaveLength(1)
  })
})
