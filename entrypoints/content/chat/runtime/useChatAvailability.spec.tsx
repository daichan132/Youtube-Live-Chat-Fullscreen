import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import { getUnavailableCurrentLiveChatVideoId } from './liveChatAvailability'
import { canToggleFullscreenChat, hasFullscreenChatSource } from './hasFullscreenChatSource'
import { useChatAvailability } from './useChatAvailability'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('./hasFullscreenChatSource', () => ({
  canToggleFullscreenChat: vi.fn(),
  hasFullscreenChatSource: vi.fn(),
}))

vi.mock('./liveChatAvailability', () => ({
  getUnavailableCurrentLiveChatVideoId: vi.fn(),
}))

describe('useChatAvailability', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(canToggleFullscreenChat).mockReset()
    vi.mocked(hasFullscreenChatSource).mockReset()
    vi.mocked(getUnavailableCurrentLiveChatVideoId).mockReset()
    vi.mocked(getUnavailableCurrentLiveChatVideoId).mockReturnValue(null)
    useYTDLiveChatNoLsStore.setState({ unavailableLiveChatVideoId: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('latches successful live switch and source checks', () => {
    vi.mocked(canToggleFullscreenChat).mockReturnValue(true)
    vi.mocked(hasFullscreenChatSource).mockReturnValue(true)
    const { result } = renderHook(() => useChatAvailability('live', 'video-a'))

    expect(result.current.canShowSwitch).toBe(true)
    expect(result.current.sourceReady).toBe(true)

    vi.mocked(canToggleFullscreenChat).mockReturnValue(false)
    vi.mocked(hasFullscreenChatSource).mockReturnValue(false)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.canShowSwitch).toBe(true)
    expect(result.current.sourceReady).toBe(true)
  })

  it('continuously monitors the archive switch while keeping a resolved source latched', () => {
    vi.mocked(canToggleFullscreenChat).mockReturnValue(true)
    vi.mocked(hasFullscreenChatSource).mockReturnValue(true)
    const { result } = renderHook(() => useChatAvailability('archive', 'video-a'))

    expect(result.current.canShowSwitch).toBe(true)

    vi.mocked(canToggleFullscreenChat).mockReturnValue(false)
    vi.mocked(hasFullscreenChatSource).mockReturnValue(false)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.canShowSwitch).toBe(false)
    expect(result.current.sourceReady).toBe(true)
  })

  it('marks unavailable live chat terminal without resolving sources', () => {
    vi.mocked(getUnavailableCurrentLiveChatVideoId).mockReturnValue('video-a')
    const { result } = renderHook(() => useChatAvailability('live', 'video-a'))

    expect(result.current.terminallyUnavailable).toBe(true)
    expect(result.current.canShowSwitch).toBe(false)
    expect(result.current.sourceReady).toBe(false)
    expect(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId).toBe('video-a')
    expect(canToggleFullscreenChat).not.toHaveBeenCalled()
    expect(hasFullscreenChatSource).not.toHaveBeenCalled()
  })

  it('clears a terminal marker when the current video changes', () => {
    useYTDLiveChatNoLsStore.setState({ unavailableLiveChatVideoId: 'video-a' })
    const { rerender } = renderHook(({ videoId }) => useChatAvailability('live', videoId), {
      initialProps: { videoId: 'video-a' },
    })

    rerender({ videoId: 'video-b' })

    expect(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId).toBeNull()
  })

  it('does not expose latched availability from the previous video', () => {
    vi.mocked(canToggleFullscreenChat).mockReturnValue(true)
    vi.mocked(hasFullscreenChatSource).mockReturnValue(true)
    const { result, rerender } = renderHook(({ videoId }) => useChatAvailability('live', videoId), {
      initialProps: { videoId: 'video-a' },
    })
    expect(result.current.canShowSwitch).toBe(true)

    vi.mocked(canToggleFullscreenChat).mockReturnValue(false)
    vi.mocked(hasFullscreenChatSource).mockReturnValue(false)
    rerender({ videoId: 'video-b' })

    expect(result.current.videoId).toBe('video-b')
    expect(result.current.canShowSwitch).toBe(false)
    expect(result.current.sourceReady).toBe(false)
  })
})
