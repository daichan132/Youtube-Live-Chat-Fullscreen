import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { changeLanguage, mockChangeYLCStyle } = vi.hoisted(() => ({
  changeLanguage: vi.fn(),
  mockChangeYLCStyle: vi.fn(),
}))

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      changeLanguage,
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

vi.mock('../ylcStyleChange/ylcStyleApplier', () => ({
  changeYLCStyle: mockChangeYLCStyle,
}))

const emitMessage = (msg: unknown) => {
  const runtime = (chrome as unknown as { runtime: { __emitMessage: (m: unknown) => void } }).runtime
  runtime.__emitMessage(msg)
}

describe('useContentRuntimeMessages', () => {
  beforeEach(() => {
    localStorage.clear()
    changeLanguage.mockClear()
    mockChangeYLCStyle.mockClear()
    vi.resetModules()
  })

  it('syncs language and global settings from runtime messages', async () => {
    const { useContentRuntimeMessages } = await import('./useContentRuntimeMessages')
    const { useGlobalSettingStore } = await import('@/shared/stores')

    renderHook(() => useContentRuntimeMessages())

    act(() => {
      emitMessage({ message: 'language', language: 'pt-BR' })
      emitMessage({ message: 'themeMode', themeMode: 'dark' })
      emitMessage({ message: 'ytdLiveChat', ytdLiveChat: false })
    })

    expect(changeLanguage).toHaveBeenCalledWith('pt_BR')
    expect(useGlobalSettingStore.getState().themeMode).toBe('dark')
    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(false)
  })

  it('ignores invalid runtime message payloads', async () => {
    const { useContentRuntimeMessages } = await import('./useContentRuntimeMessages')
    const { useGlobalSettingStore } = await import('@/shared/stores')

    renderHook(() => useContentRuntimeMessages())

    act(() => {
      emitMessage({ message: 'language', language: 123 })
      emitMessage({ message: 'themeMode', themeMode: 'neon' })
      emitMessage({ message: 'ytdLiveChat', ytdLiveChat: 'false' })
      emitMessage(null)
      emitMessage('settingsImported')
    })

    expect(changeLanguage).not.toHaveBeenCalled()
    expect(useGlobalSettingStore.getState().themeMode).toBe('system')
    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(true)
    expect(mockChangeYLCStyle).not.toHaveBeenCalled()
  })

  it('rehydrates stores and applies all style properties on settingsImported message', async () => {
    const { useContentRuntimeMessages } = await import('./useContentRuntimeMessages')
    const { useYTDLiveChatStore } = await import('@/shared/stores/ytdLiveChatStore')

    expect(useYTDLiveChatStore.getState().fontSize).toBe(13)

    renderHook(() => useContentRuntimeMessages())

    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: {
          fontSize: 42,
          bgColor: { r: 100, g: 150, b: 200, a: 0.8 },
          fontColor: { r: 255, g: 100, b: 50, a: 0.9 },
          membershipNameColor: { r: 10, g: 20, b: 30, a: 1 },
          fontFamily: 'Noto Sans JP',
          blur: 5,
          space: 15,
          userNameDisplay: false,
          userIconDisplay: false,
          superChatBarDisplay: false,
          alwaysOnDisplay: false,
          chatOnlyDisplay: true,
        },
        version: 2,
      }),
    )

    act(() => {
      emitMessage({ message: 'settingsImported' })
    })

    await waitFor(() => {
      expect(mockChangeYLCStyle).toHaveBeenCalledTimes(1)
    })

    expect(mockChangeYLCStyle).toHaveBeenCalledWith({
      fontSize: 42,
      bgColor: { r: 100, g: 150, b: 200, a: 0.8 },
      fontColor: { r: 255, g: 100, b: 50, a: 0.9 },
      membershipNameColor: { r: 10, g: 20, b: 30, a: 1 },
      fontFamily: 'Noto Sans JP',
      blur: 5,
      space: 15,
      userNameDisplay: false,
      userIconDisplay: false,
      superChatBarDisplay: false,
    })
  })

  it('rehydrates preset data into the store', async () => {
    const { useContentRuntimeMessages } = await import('./useContentRuntimeMessages')
    const { useYTDLiveChatStore } = await import('@/shared/stores/ytdLiveChatStore')

    renderHook(() => useContentRuntimeMessages())

    const customPresets = {
      presetItemIds: ['p1', 'p2'],
      presetItemStyles: {
        p1: {
          fontSize: 20,
          bgColor: { r: 0, g: 0, b: 0, a: 1 },
          fontColor: { r: 255, g: 255, b: 255, a: 1 },
          fontFamily: '',
          blur: 0,
          space: 0,
          alwaysOnDisplay: true,
          chatOnlyDisplay: false,
          userNameDisplay: true,
          userIconDisplay: true,
          superChatBarDisplay: true,
        },
        p2: {
          fontSize: 16,
          bgColor: { r: 255, g: 255, b: 255, a: 0.5 },
          fontColor: { r: 0, g: 0, b: 0, a: 1 },
          fontFamily: 'Zen Maru Gothic',
          blur: 10,
          space: 5,
          alwaysOnDisplay: true,
          chatOnlyDisplay: true,
          userNameDisplay: false,
          userIconDisplay: true,
          superChatBarDisplay: false,
        },
      },
      presetItemTitles: { p1: 'Preset One', p2: 'Preset Two' },
    }

    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: { ...customPresets, fontSize: 20 },
        version: 2,
      }),
    )

    act(() => {
      emitMessage({ message: 'settingsImported' })
    })

    await waitFor(() => {
      expect(mockChangeYLCStyle).toHaveBeenCalled()
    })

    const state = useYTDLiveChatStore.getState()
    expect(state.presetItemIds).toEqual(['p1', 'p2'])
    expect(state.presetItemStyles.p1.fontSize).toBe(20)
    expect(state.presetItemStyles.p2.fontSize).toBe(16)
    expect(state.presetItemStyles.p2.fontFamily).toBe('Zen Maru Gothic')
    expect(state.presetItemTitles.p1).toBe('Preset One')
    expect(state.presetItemTitles.p2).toBe('Preset Two')
  })

  it('rehydrates geometry into the store', async () => {
    const { useContentRuntimeMessages } = await import('./useContentRuntimeMessages')
    const { useYTDLiveChatStore } = await import('@/shared/stores/ytdLiveChatStore')

    renderHook(() => useContentRuntimeMessages())

    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: { coordinates: { x: 100, y: 200 }, size: { width: 600, height: 800 } },
        version: 2,
      }),
    )

    act(() => {
      emitMessage({ message: 'settingsImported' })
    })

    await waitFor(() => {
      expect(mockChangeYLCStyle).toHaveBeenCalled()
    })

    const state = useYTDLiveChatStore.getState()
    expect(state.coordinates).toEqual({ x: 100, y: 200 })
    expect(state.size).toEqual({ width: 600, height: 800 })
  })

  it('rehydrates globalSettingStore values on settingsImported message', async () => {
    const { useContentRuntimeMessages } = await import('./useContentRuntimeMessages')
    const { useGlobalSettingStore } = await import('@/shared/stores/globalSettingStore')

    expect(useGlobalSettingStore.getState().themeMode).toBe('system')
    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(true)

    renderHook(() => useContentRuntimeMessages())

    localStorage.setItem(
      'globalSettingStore',
      JSON.stringify({
        state: { ytdLiveChat: false, themeMode: 'dark' },
        version: 1,
      }),
    )

    act(() => {
      emitMessage({ message: 'settingsImported' })
    })

    await waitFor(() => {
      expect(useGlobalSettingStore.getState().themeMode).toBe('dark')
    })

    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(false)
  })

  it('removes the single runtime listener on unmount', async () => {
    const { useContentRuntimeMessages } = await import('./useContentRuntimeMessages')
    const runtime = chrome.runtime as unknown as {
      __listenerCount: () => number
      onMessage: {
        removeListener: ReturnType<typeof vi.fn>
      }
    }

    const { unmount } = renderHook(() => useContentRuntimeMessages())

    expect(runtime.__listenerCount()).toBe(1)

    unmount()

    expect(runtime.__listenerCount()).toBe(0)
    expect(runtime.onMessage.removeListener).toHaveBeenCalledTimes(1)
  })

  it('applies styles using values from rehydrated store, not stale state', async () => {
    const { useContentRuntimeMessages } = await import('./useContentRuntimeMessages')
    const { useYTDLiveChatStore } = await import('@/shared/stores/ytdLiveChatStore')

    useYTDLiveChatStore.setState({ fontSize: 20 })
    expect(useYTDLiveChatStore.getState().fontSize).toBe(20)

    renderHook(() => useContentRuntimeMessages())

    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: { fontSize: 99 },
        version: 2,
      }),
    )

    act(() => {
      emitMessage({ message: 'settingsImported' })
    })

    await waitFor(() => {
      expect(mockChangeYLCStyle).toHaveBeenCalled()
    })

    expect(mockChangeYLCStyle).toHaveBeenCalledWith(expect.objectContaining({ fontSize: 99 }))
    expect(useYTDLiveChatStore.getState().fontSize).toBe(99)
  })

  it('handles sequential imports, each overwriting the previous values and presets', async () => {
    const { useContentRuntimeMessages } = await import('./useContentRuntimeMessages')
    const { useYTDLiveChatStore } = await import('@/shared/stores/ytdLiveChatStore')

    renderHook(() => useContentRuntimeMessages())

    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: {
          fontSize: 42,
          space: 15,
          userNameDisplay: false,
          superChatBarDisplay: false,
          presetItemIds: ['dark1'],
          presetItemStyles: {
            dark1: {
              fontSize: 20,
              bgColor: { r: 0, g: 0, b: 0, a: 1 },
              fontColor: { r: 255, g: 255, b: 255, a: 1 },
              fontFamily: '',
              blur: 0,
              space: 0,
              alwaysOnDisplay: true,
              chatOnlyDisplay: false,
              userNameDisplay: true,
              userIconDisplay: true,
              superChatBarDisplay: true,
            },
          },
          presetItemTitles: { dark1: 'Dark Mode' },
        },
        version: 2,
      }),
    )

    act(() => {
      emitMessage({ message: 'settingsImported' })
    })

    await waitFor(() => {
      expect(mockChangeYLCStyle).toHaveBeenCalledTimes(1)
    })

    expect(mockChangeYLCStyle).toHaveBeenLastCalledWith(expect.objectContaining({ fontSize: 42, space: 15, userNameDisplay: false }))
    expect(useYTDLiveChatStore.getState().presetItemIds).toEqual(['dark1'])
    expect(useYTDLiveChatStore.getState().presetItemTitles.dark1).toBe('Dark Mode')

    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: {
          fontSize: 18,
          space: 5,
          userNameDisplay: true,
          superChatBarDisplay: true,
          presetItemIds: ['light1', 'light2'],
          presetItemStyles: {
            light1: {
              fontSize: 14,
              bgColor: { r: 255, g: 255, b: 255, a: 1 },
              fontColor: { r: 0, g: 0, b: 0, a: 1 },
              fontFamily: '',
              blur: 0,
              space: 0,
              alwaysOnDisplay: true,
              chatOnlyDisplay: false,
              userNameDisplay: true,
              userIconDisplay: true,
              superChatBarDisplay: true,
            },
            light2: {
              fontSize: 24,
              bgColor: { r: 240, g: 240, b: 240, a: 0.8 },
              fontColor: { r: 30, g: 30, b: 30, a: 1 },
              fontFamily: 'Zen Maru Gothic',
              blur: 5,
              space: 10,
              alwaysOnDisplay: true,
              chatOnlyDisplay: true,
              userNameDisplay: false,
              userIconDisplay: true,
              superChatBarDisplay: false,
            },
          },
          presetItemTitles: { light1: 'Light', light2: 'Large Light' },
        },
        version: 2,
      }),
    )

    act(() => {
      emitMessage({ message: 'settingsImported' })
    })

    await waitFor(() => {
      expect(mockChangeYLCStyle).toHaveBeenCalledTimes(2)
    })

    expect(mockChangeYLCStyle).toHaveBeenLastCalledWith(expect.objectContaining({ fontSize: 18, space: 5, userNameDisplay: true }))

    const state = useYTDLiveChatStore.getState()
    expect(state.fontSize).toBe(18)
    expect(state.presetItemIds).toEqual(['light1', 'light2'])
    expect(state.presetItemStyles.light1.fontSize).toBe(14)
    expect(state.presetItemStyles.light2.fontSize).toBe(24)
    expect(state.presetItemTitles.light1).toBe('Light')
    expect(state.presetItemTitles.light2).toBe('Large Light')
    expect(state.presetItemStyles).not.toHaveProperty('dark1')
    expect(state.presetItemTitles).not.toHaveProperty('dark1')
  })
})
