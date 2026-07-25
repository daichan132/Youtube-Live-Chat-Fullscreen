import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SETTINGS_STORAGE_ORIGIN_ID } from '@/shared/settings/originAwareStorage'
import { YTD_LIVE_CHAT_PERSIST } from '@/shared/settings/persistConfig'
import { useGlobalSettingStore } from '@/shared/stores/globalSettingStore'
import { useYTDLiveChatHistoryStore } from '@/shared/stores/ytdLiveChatHistoryStore'
import { useYTDLiveChatStore } from '@/shared/stores/ytdLiveChatStore'
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

const serializeCurrentYTDLiveChatState = (overrides: Record<string, unknown> = {}, originId?: string) =>
  JSON.stringify({
    state: {
      ...useYTDLiveChatStore.getState(),
      ...overrides,
    },
    version: YTD_LIVE_CHAT_PERSIST.version,
    ...(originId ? { originId } : {}),
  })

const serializeCurrentGlobalSettingState = (originId?: string) =>
  JSON.stringify({
    state: useGlobalSettingStore.getState(),
    version: 1,
    ...(originId ? { originId } : {}),
  })

describe('useSettingsStorageSync', () => {
  beforeEach(() => {
    storageListeners.clear()
    onChanged.addListener.mockClear()
    onChanged.removeListener.mockClear()
    vi.spyOn(useGlobalSettingStore.persist, 'rehydrate').mockResolvedValue(undefined)
    vi.spyOn(useYTDLiveChatStore.persist, 'rehydrate').mockResolvedValue(undefined)
    vi.spyOn(useYTDLiveChatHistoryStore.getState(), 'clear')
  })

  it('rehydrates both stores and clears style history for an imported backup', async () => {
    const nextFontSize = useYTDLiveChatStore.getState().fontSize + 1
    vi.mocked(useYTDLiveChatStore.persist.rehydrate).mockImplementationOnce(async () => {
      useYTDLiveChatStore.setState({ fontSize: nextFontSize })
    })
    renderHook(() => useSettingsStorageSync())

    act(() => {
      emitStorageChange({
        globalSettingStore: {},
        ytdLiveChatStore: {
          newValue: serializeCurrentYTDLiveChatState({
            fontSize: nextFontSize,
          }),
        },
      })
    })

    await waitFor(() => {
      expect(useGlobalSettingStore.persist.rehydrate).toHaveBeenCalledTimes(1)
      expect(useYTDLiveChatStore.persist.rehydrate).toHaveBeenCalledTimes(1)
      expect(useYTDLiveChatHistoryStore.getState().clear).toHaveBeenCalledTimes(1)
    })
  })

  it('keeps style history for its own save even when a newer local edit already exists', async () => {
    useYTDLiveChatHistoryStore.setState({
      past: [
        {
          before: {
            style: useYTDLiveChatStore.getState(),
            addPresetEnabled: true,
          },
          after: {
            style: {
              ...useYTDLiveChatStore.getState(),
              fontSize: useYTDLiveChatStore.getState().fontSize + 1,
            },
            addPresetEnabled: true,
          },
          label: 'fontSize',
        },
      ],
      future: [],
      activeGesture: null,
    })
    renderHook(() => useSettingsStorageSync())

    act(() => {
      emitStorageChange({
        ytdLiveChatStore: {
          newValue: serializeCurrentYTDLiveChatState(
            {
              fontSize: useYTDLiveChatStore.getState().fontSize - 1,
            },
            SETTINGS_STORAGE_ORIGIN_ID,
          ),
        },
      })
    })

    await waitFor(() => {
      expect(useYTDLiveChatStore.persist.rehydrate).not.toHaveBeenCalled()
      expect(useYTDLiveChatHistoryStore.getState().clear).not.toHaveBeenCalled()
      expect(useYTDLiveChatHistoryStore.getState().past).toHaveLength(1)
    })
  })

  it('does not rehydrate global settings for their own persisted state', async () => {
    renderHook(() => useSettingsStorageSync())

    act(() => {
      emitStorageChange({
        globalSettingStore: {
          newValue: serializeCurrentGlobalSettingState(SETTINGS_STORAGE_ORIGIN_ID),
        },
      })
    })

    await waitFor(() => {
      expect(useGlobalSettingStore.persist.rehydrate).not.toHaveBeenCalled()
    })
  })

  it('rehydrates an identical state saved by another extension context', async () => {
    renderHook(() => useSettingsStorageSync())

    act(() => {
      emitStorageChange({
        ytdLiveChatStore: {
          newValue: serializeCurrentYTDLiveChatState({}, 'another-context'),
        },
      })
    })

    await waitFor(() => {
      expect(useYTDLiveChatStore.persist.rehydrate).toHaveBeenCalledTimes(1)
      expect(useYTDLiveChatHistoryStore.getState().clear).not.toHaveBeenCalled()
    })
  })

  it('does not persist viewport fitting or clear style history for an external geometry-only change', async () => {
    const setGeometry = vi.spyOn(useYTDLiveChatStore.getState(), 'setGeometry')
    vi.mocked(useYTDLiveChatStore.persist.rehydrate).mockImplementationOnce(async () => {
      useYTDLiveChatStore.setState({
        coordinates: { x: 1_000, y: 700 },
        size: { width: 800, height: 600 },
      })
    })
    renderHook(() => useSettingsStorageSync())

    act(() => {
      emitStorageChange({
        ytdLiveChatStore: {
          newValue: serializeCurrentYTDLiveChatState(
            {
              coordinates: { x: 1_000, y: 700 },
              size: { width: 800, height: 600 },
            },
            'another-context',
          ),
        },
      })
    })

    await waitFor(() => {
      expect(useYTDLiveChatStore.persist.rehydrate).toHaveBeenCalledTimes(1)
    })
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 1_000, y: 700 })
    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 800, height: 600 })
    expect(setGeometry).not.toHaveBeenCalled()
    expect(useYTDLiveChatHistoryStore.getState().clear).not.toHaveBeenCalled()
  })

  it('ignores unrelated keys and non-local storage', () => {
    const { unmount } = renderHook(() => useSettingsStorageSync())

    act(() => {
      emitStorageChange({ other: {} })
      emitStorageChange({ globalSettingStore: {} }, 'sync')
    })

    expect(useGlobalSettingStore.persist.rehydrate).not.toHaveBeenCalled()
    expect(useYTDLiveChatStore.persist.rehydrate).not.toHaveBeenCalled()

    unmount()
    expect(onChanged.removeListener).toHaveBeenCalledTimes(1)
  })
})
