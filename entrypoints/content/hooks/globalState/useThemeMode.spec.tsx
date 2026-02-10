import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

describe('useThemeMode', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('updates the global theme setting when a runtime message arrives', async () => {
    const { useThemeMode } = await import('./useThemeMode')
    const { useGlobalSettingStore } = await import('@/shared/stores')

    const { result } = renderHook(() => useThemeMode())

    expect(result.current[0]).toBe('system')

    const runtime = (chrome as unknown as { runtime: { __emitMessage: (message: unknown) => void } }).runtime

    act(() => {
      runtime.__emitMessage({ message: 'themeMode', themeMode: 'dark' })
    })

    expect(useGlobalSettingStore.getState().themeMode).toBe('dark')
    expect(result.current[0]).toBe('dark')
  })
})
