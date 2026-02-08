import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLiveChatIframe, isArchiveChatPlayable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { isYouTubeLiveNow } from '@/entrypoints/content/utils/isYouTubeLiveNow'
import { openArchiveNativeChatPanel } from '@/entrypoints/content/utils/nativeChat'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import { useEnsureArchiveChatOpen } from './useEnsureArchiveChatOpen'

vi.mock('@/entrypoints/content/utils/hasPlayableLiveChat', () => ({
  getLiveChatIframe: vi.fn(),
  isArchiveChatPlayable: vi.fn(),
}))

vi.mock('@/entrypoints/content/utils/isYouTubeLiveNow', () => ({
  isYouTubeLiveNow: vi.fn(),
}))

vi.mock('@/entrypoints/content/utils/nativeChat', () => ({
  openArchiveNativeChatPanel: vi.fn(),
}))

const getLiveChatIframeMock = vi.mocked(getLiveChatIframe)
const isArchiveChatPlayableMock = vi.mocked(isArchiveChatPlayable)
const isYouTubeLiveNowMock = vi.mocked(isYouTubeLiveNow)
const openArchiveNativeChatPanelMock = vi.mocked(openArchiveNativeChatPanel)
const noLsStoreBaseState = useYTDLiveChatNoLsStore.getState()

describe('useEnsureArchiveChatOpen', () => {
  let fullscreenElement: Element | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    fullscreenElement = document.documentElement
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    })

    useYTDLiveChatNoLsStore.setState(noLsStoreBaseState, true)
    getLiveChatIframeMock.mockReturnValue(document.createElement('iframe'))
    isArchiveChatPlayableMock.mockReturnValue(false)
    isYouTubeLiveNowMock.mockReturnValue(false)
    openArchiveNativeChatPanelMock.mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => null,
    })

    getLiveChatIframeMock.mockReset()
    isArchiveChatPlayableMock.mockReset()
    isYouTubeLiveNowMock.mockReset()
    openArchiveNativeChatPanelMock.mockReset()
  })

  it('waits until fullscreen is active before opening native chat', () => {
    fullscreenElement = null
    const { unmount } = renderHook(() => useEnsureArchiveChatOpen(true))

    expect(openArchiveNativeChatPanelMock).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(openArchiveNativeChatPanelMock).not.toHaveBeenCalled()

    fullscreenElement = document.documentElement
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('does nothing on live streams', () => {
    isYouTubeLiveNowMock.mockReturnValue(true)

    const { unmount } = renderHook(() => useEnsureArchiveChatOpen(true))

    expect(openArchiveNativeChatPanelMock).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(openArchiveNativeChatPanelMock).not.toHaveBeenCalled()
    unmount()
  })

  it('retries opening with cooldown while archive chat is not playable', () => {
    const { unmount } = renderHook(() => useEnsureArchiveChatOpen(true))

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('stops retrying once archive chat becomes playable', () => {
    isArchiveChatPlayableMock.mockReturnValueOnce(false).mockReturnValue(true)

    const { unmount } = renderHook(() => useEnsureArchiveChatOpen(true))

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('stops ensure loop when archive iframe is already borrowed by fullscreen chat', () => {
    const borrowedIframe = document.createElement('iframe')
    borrowedIframe.setAttribute('data-ylc-chat', 'true')
    document.body.appendChild(borrowedIframe)
    useYTDLiveChatNoLsStore.setState({
      iframeElement: borrowedIframe,
    })

    const { unmount } = renderHook(() => useEnsureArchiveChatOpen(true))

    expect(openArchiveNativeChatPanelMock).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(openArchiveNativeChatPanelMock).not.toHaveBeenCalled()
    unmount()
  })
})
