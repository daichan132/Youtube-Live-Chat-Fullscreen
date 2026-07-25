import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import { detectChatMode } from './detectChatMode'
import { canToggleFullscreenChat, hasFullscreenChatSource } from './hasFullscreenChatSource'
import { getUnavailableCurrentLiveChatVideoId } from './liveChatAvailability'
import { useYouTubeChatRuntime } from './useYouTubeChatRuntime'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('@/entrypoints/content/utils/getYouTubeVideoId', () => ({
  getCurrentYouTubeVideoId: vi.fn(),
}))

vi.mock('./detectChatMode', () => ({
  detectChatMode: vi.fn(),
}))

vi.mock('./hasFullscreenChatSource', () => ({
  canToggleFullscreenChat: vi.fn(),
  hasFullscreenChatSource: vi.fn(),
}))

vi.mock('./liveChatAvailability', () => ({
  getUnavailableCurrentLiveChatVideoId: vi.fn(),
}))

describe('useYouTubeChatRuntime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = ''
    vi.mocked(getCurrentYouTubeVideoId).mockReset()
    vi.mocked(detectChatMode).mockReset()
    vi.mocked(canToggleFullscreenChat).mockReset()
    vi.mocked(hasFullscreenChatSource).mockReset()
    vi.mocked(getUnavailableCurrentLiveChatVideoId).mockReset()
    vi.mocked(getCurrentYouTubeVideoId).mockReturnValue('video-a')
    vi.mocked(detectChatMode).mockReturnValue('live')
    vi.mocked(canToggleFullscreenChat).mockReturnValue(true)
    vi.mocked(hasFullscreenChatSource).mockReturnValue(true)
    vi.mocked(getUnavailableCurrentLiveChatVideoId).mockReturnValue(null)
    useYTDLiveChatNoLsStore.setState({ unavailableLiveChatVideoId: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('latches successful live switch and source checks', () => {
    const { result } = renderHook(() => useYouTubeChatRuntime())

    expect(result.current).toMatchObject({
      videoId: 'video-a',
      mode: 'live',
      canShowSwitch: true,
      sourceReady: true,
      terminallyUnavailable: false,
    })

    vi.mocked(canToggleFullscreenChat).mockReturnValue(false)
    vi.mocked(hasFullscreenChatSource).mockReturnValue(false)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.canShowSwitch).toBe(true)
    expect(result.current.sourceReady).toBe(true)
  })

  it('continuously monitors the archive switch while keeping a resolved source latched', () => {
    vi.mocked(detectChatMode).mockReturnValue('archive')
    const { result } = renderHook(() => useYouTubeChatRuntime())

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
    const { result } = renderHook(() => useYouTubeChatRuntime())

    expect(result.current.terminallyUnavailable).toBe(true)
    expect(result.current.canShowSwitch).toBe(false)
    expect(result.current.sourceReady).toBe(false)
    expect(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId).toBe('video-a')
    expect(canToggleFullscreenChat).not.toHaveBeenCalled()
    expect(hasFullscreenChatSource).not.toHaveBeenCalled()
  })

  it('clears the previous video marker and resets availability latches atomically', () => {
    useYTDLiveChatNoLsStore.setState({ unavailableLiveChatVideoId: 'video-a' })
    const { result } = renderHook(() => useYouTubeChatRuntime())
    expect(result.current.terminallyUnavailable).toBe(true)

    vi.mocked(getCurrentYouTubeVideoId).mockReturnValue('video-b')
    vi.mocked(canToggleFullscreenChat).mockReturnValue(false)
    vi.mocked(hasFullscreenChatSource).mockReturnValue(false)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current).toMatchObject({
      videoId: 'video-b',
      canShowSwitch: false,
      sourceReady: false,
      terminallyUnavailable: false,
    })
    expect(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId).toBeNull()
  })

  it('uses one fallback interval and one SPA navigation listener', () => {
    const intervalSpy = vi.spyOn(window, 'setInterval')
    const addListenerSpy = vi.spyOn(document, 'addEventListener')

    renderHook(() => useYouTubeChatRuntime())

    expect(intervalSpy).toHaveBeenCalledTimes(1)
    expect(addListenerSpy.mock.calls.filter(([eventName]) => eventName === 'yt-navigate-finish')).toHaveLength(1)
  })

  it('increments revision when a chat boundary is regenerated without changing its snapshot', async () => {
    const { result } = renderHook(() => useYouTubeChatRuntime())
    const initialRevision = result.current.revision

    await act(async () => {
      const chatContainer = document.createElement('div')
      chatContainer.id = 'chat-container'
      document.body.append(chatContainer)
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(16)
    })

    expect(result.current.revision).toBeGreaterThan(initialRevision)
  })
})
