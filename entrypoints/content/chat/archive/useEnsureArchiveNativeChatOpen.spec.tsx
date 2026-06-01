import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLiveChatDocument, isArchiveChatPlayable, isLiveChatUnavailable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { isYouTubeLiveNow } from '@/entrypoints/content/utils/isYouTubeLiveNow'
import { openArchiveNativeChatPanel } from '@/entrypoints/content/utils/nativeChat'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import { getCurrentLiveChatIframe } from '../shared/iframeDom'
import { useEnsureArchiveNativeChatOpen } from './useEnsureArchiveNativeChatOpen'

vi.mock('@/entrypoints/content/utils/hasPlayableLiveChat', () => ({
  getLiveChatDocument: vi.fn(),
  isArchiveChatPlayable: vi.fn(),
  isLiveChatUnavailable: vi.fn(),
}))

vi.mock('../shared/iframeDom', async () => {
  const actual = await vi.importActual<typeof import('../shared/iframeDom')>('../shared/iframeDom')
  return {
    ...actual,
    getCurrentLiveChatIframe: vi.fn(),
  }
})

vi.mock('@/entrypoints/content/utils/isYouTubeLiveNow', () => ({
  isYouTubeLiveNow: vi.fn(),
}))

vi.mock('@/entrypoints/content/utils/nativeChat', () => ({
  openArchiveNativeChatPanel: vi.fn(),
}))

const getLiveChatDocumentMock = vi.mocked(getLiveChatDocument)
const getCurrentLiveChatIframeMock = vi.mocked(getCurrentLiveChatIframe)
const isArchiveChatPlayableMock = vi.mocked(isArchiveChatPlayable)
const isLiveChatUnavailableMock = vi.mocked(isLiveChatUnavailable)
const isYouTubeLiveNowMock = vi.mocked(isYouTubeLiveNow)
const openArchiveNativeChatPanelMock = vi.mocked(openArchiveNativeChatPanel)
const noLsStoreBaseState = useYTDLiveChatNoLsStore.getState()

const createNativeIframe = (src = 'https://www.youtube.com/live_chat_replay?v=video-a') => {
  const iframe = document.createElement('iframe')
  iframe.src = src
  return iframe
}

describe('useEnsureArchiveNativeChatOpen', () => {
  let fullscreenElement: Element | null = null

  beforeEach(() => {
    window.history.pushState({}, '', `${window.location.origin}/watch?v=video-a`)
    vi.useFakeTimers()
    fullscreenElement = document.documentElement
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    })

    useYTDLiveChatNoLsStore.setState(noLsStoreBaseState, true)
    getCurrentLiveChatIframeMock.mockReturnValue(createNativeIframe())
    getLiveChatDocumentMock.mockReturnValue(null)
    isArchiveChatPlayableMock.mockReturnValue(false)
    isLiveChatUnavailableMock.mockReturnValue(false)
    isYouTubeLiveNowMock.mockReturnValue(false)
    openArchiveNativeChatPanelMock.mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => null,
    })

    getLiveChatDocumentMock.mockReset()
    getCurrentLiveChatIframeMock.mockReset()
    isArchiveChatPlayableMock.mockReset()
    isLiveChatUnavailableMock.mockReset()
    isYouTubeLiveNowMock.mockReset()
    openArchiveNativeChatPanelMock.mockReset()
  })

  it('waits until fullscreen is active before opening native chat', () => {
    fullscreenElement = null
    const { unmount } = renderHook(() => useEnsureArchiveNativeChatOpen(true))

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

    const { unmount } = renderHook(() => useEnsureArchiveNativeChatOpen(true))

    expect(openArchiveNativeChatPanelMock).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(openArchiveNativeChatPanelMock).not.toHaveBeenCalled()
    unmount()
  })

  it('retries opening with cooldown while archive chat is not playable', () => {
    const { unmount } = renderHook(() => useEnsureArchiveNativeChatOpen(true))

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

    const { unmount } = renderHook(() => useEnsureArchiveNativeChatOpen(true))

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('stops retrying when native archive chat is explicitly unavailable', () => {
    const unavailableDocument = document.implementation.createHTMLDocument()
    getLiveChatDocumentMock.mockReturnValue(unavailableDocument)
    isLiveChatUnavailableMock.mockReturnValue(true)

    const { unmount } = renderHook(() => useEnsureArchiveNativeChatOpen(true))

    expect(openArchiveNativeChatPanelMock).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(openArchiveNativeChatPanelMock).not.toHaveBeenCalled()
    unmount()
  })

  it('keeps ensure loop running when an unavailable native document belongs to stale page DOM', () => {
    window.history.pushState({}, '', `${window.location.origin}/watch?v=video-b`)
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'video-a')
    document.body.appendChild(watchFlexy)
    getCurrentLiveChatIframeMock.mockReturnValue(createNativeIframe('https://www.youtube.com/live_chat_replay?continuation=stale-video-a'))
    const unavailableDocument = document.implementation.createHTMLDocument()
    getLiveChatDocumentMock.mockReturnValue(unavailableDocument)
    isLiveChatUnavailableMock.mockReturnValue(true)

    const { unmount } = renderHook(() => useEnsureArchiveNativeChatOpen(true))

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('stops ensure loop when archive iframe is already borrowed by fullscreen chat', () => {
    const borrowedIframe = document.createElement('iframe')
    borrowedIframe.setAttribute('data-ylc-chat', 'true')
    borrowedIframe.src = 'https://www.youtube.com/live_chat_replay?v=video-a'
    document.body.appendChild(borrowedIframe)
    useYTDLiveChatNoLsStore.setState({
      iframeElement: borrowedIframe,
    })

    const { unmount } = renderHook(() => useEnsureArchiveNativeChatOpen(true))

    expect(openArchiveNativeChatPanelMock).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(openArchiveNativeChatPanelMock).not.toHaveBeenCalled()
    unmount()
  })

  it('keeps ensure loop running when marked borrowed iframe is for another video', () => {
    const borrowedIframe = document.createElement('iframe')
    borrowedIframe.setAttribute('data-ylc-chat', 'true')
    borrowedIframe.src = 'https://www.youtube.com/live_chat_replay?v=video-b'
    document.body.appendChild(borrowedIframe)
    useYTDLiveChatNoLsStore.setState({
      iframeElement: borrowedIframe,
    })

    const { unmount } = renderHook(() => useEnsureArchiveNativeChatOpen(true))

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('keeps ensure loop running when marked borrowed iframe has only a stale continuation URL', () => {
    window.history.pushState({}, '', `${window.location.origin}/watch?v=video-b`)
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'video-a')
    document.body.appendChild(watchFlexy)
    getCurrentLiveChatIframeMock.mockReturnValue(null)
    const borrowedIframe = document.createElement('iframe')
    borrowedIframe.setAttribute('data-ylc-chat', 'true')
    borrowedIframe.src = 'https://www.youtube.com/live_chat_replay?continuation=stale-video-a'
    document.body.appendChild(borrowedIframe)
    useYTDLiveChatNoLsStore.setState({
      iframeElement: borrowedIframe,
    })

    const { unmount } = renderHook(() => useEnsureArchiveNativeChatOpen(true))

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('keeps ensure loop running when marked borrowed iframe is not replay chat', () => {
    const borrowedIframe = document.createElement('iframe')
    borrowedIframe.setAttribute('data-ylc-chat', 'true')
    borrowedIframe.src = 'https://www.youtube.com/live_chat?v=video-a'
    document.body.appendChild(borrowedIframe)
    useYTDLiveChatNoLsStore.setState({
      iframeElement: borrowedIframe,
    })

    const { unmount } = renderHook(() => useEnsureArchiveNativeChatOpen(true))

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('keeps ensure loop running when only managed live iframe is attached', () => {
    const attachedIframe = document.createElement('iframe')
    attachedIframe.setAttribute('data-ylc-chat', 'true')
    attachedIframe.setAttribute('data-ylc-owned', 'true')
    attachedIframe.src = 'https://www.youtube.com/live_chat?v=video-a'
    document.body.appendChild(attachedIframe)
    useYTDLiveChatNoLsStore.setState({
      iframeElement: attachedIframe,
    })

    const { unmount } = renderHook(() => useEnsureArchiveNativeChatOpen(true))

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(2)
    unmount()
  })
})
