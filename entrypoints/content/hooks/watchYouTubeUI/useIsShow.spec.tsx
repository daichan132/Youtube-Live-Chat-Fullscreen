import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hasPlayableLiveChat } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { useYTDLiveChatStore } from '@/shared/stores'
import { useIsShow } from './useIsShow'
import { useNativeChatState } from './useNativeChatState'
import { usePollingWithNavigate } from './usePollingWithNavigate'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('@/entrypoints/content/utils/hasPlayableLiveChat', () => ({
  hasPlayableLiveChat: vi.fn(() => true),
}))

vi.mock('./usePollingWithNavigate', () => ({
  usePollingWithNavigate: vi.fn(({ checkFn }: { checkFn: () => boolean }) => checkFn()),
}))

vi.mock('./useNativeChatState', () => ({
  useNativeChatState: vi.fn(() => ({
    isNativeChatUsable: true,
    isNativeChatExpanded: false,
  })),
}))

const hasPlayableLiveChatMock = vi.mocked(hasPlayableLiveChat)
const baseState = useYTDLiveChatStore.getState()

const appendYtdApp = () => {
  const ytdApp = document.createElement('ytd-app')
  document.body.append(ytdApp)
  return ytdApp
}

const resetStore = () => {
  useYTDLiveChatStore.setState(
    {
      ...baseState,
      coordinates: { ...baseState.coordinates },
      size: { ...baseState.size },
      presetItemIds: [...baseState.presetItemIds],
      presetItemStyles: { ...baseState.presetItemStyles },
      presetItemTitles: { ...baseState.presetItemTitles },
    },
    true,
  )
}

describe('useIsShow', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    resetStore()
    vi.mocked(usePollingWithNavigate).mockClear()
    hasPlayableLiveChatMock.mockReset()
    hasPlayableLiveChatMock.mockReturnValue(true)
    vi.mocked(useNativeChatState).mockReturnValue({
      isNativeChatUsable: true,
      isNativeChatExpanded: false,
    })
  })

  it('shows when YouTube masthead is hidden and chat is playable', async () => {
    const ytdApp = appendYtdApp()
    ytdApp.setAttribute('masthead-hidden', '')

    const { result } = renderHook(() => useIsShow(false))

    await waitFor(() => {
      expect(result.current.isShow).toBe(true)
    })
    expect(usePollingWithNavigate).toHaveBeenCalledWith({
      checkFn: expect.any(Function),
      intervalMs: 2000,
      stopOnSuccess: false,
    })
    expect(hasPlayableLiveChatMock).toHaveBeenCalled()
    expect(result.current.isNativeChatUsable).toBe(true)
    expect(result.current.isNativeChatExpanded).toBe(false)
  })

  it('shows in fullscreen even when masthead-hidden is absent', async () => {
    appendYtdApp()

    const { result } = renderHook(() => useIsShow(true))

    await waitFor(() => {
      expect(result.current.isShow).toBe(true)
    })
  })

  it('updates when YouTube toggles the masthead-hidden attribute', async () => {
    const ytdApp = appendYtdApp()
    const { result } = renderHook(() => useIsShow(false))

    expect(result.current.isShow).toBe(false)

    act(() => {
      ytdApp.setAttribute('masthead-hidden', '')
    })

    await waitFor(() => {
      expect(result.current.isShow).toBe(true)
    })
  })

  it('hides again when YouTube removes the masthead-hidden attribute', async () => {
    const ytdApp = appendYtdApp()
    ytdApp.setAttribute('masthead-hidden', '')
    const { result } = renderHook(() => useIsShow(false))

    await waitFor(() => {
      expect(result.current.isShow).toBe(true)
    })

    act(() => {
      ytdApp.removeAttribute('masthead-hidden')
    })

    await waitFor(() => {
      expect(result.current.isShow).toBe(false)
    })
  })

  it('hides when leaving fullscreen without masthead-hidden', async () => {
    appendYtdApp()
    const { result, rerender } = renderHook(({ isFullscreen }) => useIsShow(isFullscreen), {
      initialProps: { isFullscreen: true },
    })

    await waitFor(() => {
      expect(result.current.isShow).toBe(true)
    })

    rerender({ isFullscreen: false })

    await waitFor(() => {
      expect(result.current.isShow).toBe(false)
    })
  })

  it('stays hidden when chat is not playable', async () => {
    hasPlayableLiveChatMock.mockReturnValue(false)
    const ytdApp = appendYtdApp()
    ytdApp.setAttribute('masthead-hidden', '')

    const { result } = renderHook(() => useIsShow(false))

    expect(result.current.isShow).toBe(false)
  })

  it('does not reset saved geometry while resolving visibility', async () => {
    const ytdApp = appendYtdApp()
    ytdApp.setAttribute('masthead-hidden', '')
    useYTDLiveChatStore.setState({
      coordinates: { x: window.innerWidth + 100, y: window.innerHeight + 100 },
      size: { width: 400, height: 600 },
    })

    const { result } = renderHook(() => useIsShow(false))

    await waitFor(() => {
      expect(result.current.isShow).toBe(true)
    })
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({
      x: window.innerWidth + 100,
      y: window.innerHeight + 100,
    })
    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 400, height: 600 })
  })
})
