import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    renderHook(() => useSettingsStorageSync())

    act(() => {
      emitStorageChange({
        globalSettingStore: {},
        ytdLiveChatStore: {},
      })
    })

    await waitFor(() => {
      expect(useGlobalSettingStore.persist.rehydrate).toHaveBeenCalledTimes(1)
      expect(useYTDLiveChatStore.persist.rehydrate).toHaveBeenCalledTimes(1)
      expect(useYTDLiveChatHistoryStore.getState().clear).toHaveBeenCalledTimes(1)
    })
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
