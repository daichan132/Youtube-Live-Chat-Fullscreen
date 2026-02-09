import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { useClipPathManagement } from './useClipPathManagement'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

const liveState = useYTDLiveChatStore.getState()
const noLsState = useYTDLiveChatNoLsStore.getState()

const resetStores = () => {
  useYTDLiveChatStore.setState(
    {
      ...liveState,
      coordinates: { ...liveState.coordinates },
      size: { ...liveState.size },
      presetItemIds: [...liveState.presetItemIds],
      presetItemStyles: { ...liveState.presetItemStyles },
      presetItemTitles: { ...liveState.presetItemTitles },
    },
    true,
  )
  useYTDLiveChatNoLsStore.setState(
    {
      ...noLsState,
      clip: { ...noLsState.clip },
    },
    true,
  )
}

describe('useClipPathManagement', () => {
  beforeEach(() => {
    resetStores()
  })

  it('adjusts coordinates and size when toggling clip path', () => {
    useYTDLiveChatStore.setState({ coordinates: { x: 10, y: 20 }, size: { width: 300, height: 200 } })
    useYTDLiveChatNoLsStore.setState({ clip: { header: 12, input: 8 } })

    const setCoordinates = vi.fn()
    const setSize = vi.fn()

    const { result } = renderHook(() => useClipPathManagement({ setCoordinates, setSize, iframeElement: null }))

    act(() => {
      result.current.handleClipPathChange(true)
    })

    expect(setCoordinates).toHaveBeenCalledWith({ x: 10, y: 8 })
    expect(setSize).toHaveBeenCalledWith({ width: 300, height: 220 })

    act(() => {
      result.current.handleClipPathChange(false)
    })

    expect(setCoordinates).toHaveBeenCalledWith({ x: 10, y: 32 })
    expect(setSize).toHaveBeenCalledWith({ width: 300, height: 180 })
  })

  it('computes clip sizes from iframe content', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    const doc = document.implementation.createHTMLDocument('')

    const header = doc.createElement('yt-live-chat-header-renderer')
    Object.defineProperty(header, 'clientHeight', { value: 40 })

    const input = doc.createElement('yt-live-chat-message-input-renderer')
    Object.defineProperty(input, 'clientHeight', { value: 24 })

    doc.body.appendChild(header)
    doc.body.appendChild(input)

    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })

    const { result } = renderHook(() =>
      useClipPathManagement({
        setCoordinates: vi.fn(),
        setSize: vi.fn(),
        iframeElement: iframe,
      }),
    )

    expect(result.current.getClip()).toEqual({ header: 32, input: 20 })
  })

  it('clamps clip sizes to zero when clip elements are missing', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    const doc = document.implementation.createHTMLDocument('')

    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })

    const { result } = renderHook(() =>
      useClipPathManagement({
        setCoordinates: vi.fn(),
        setSize: vi.fn(),
        iframeElement: iframe,
      }),
    )

    expect(result.current.getClip()).toEqual({ header: 0, input: 0 })
  })

  it('uses clip override when provided', () => {
    useYTDLiveChatStore.setState({ coordinates: { x: 10, y: 20 }, size: { width: 300, height: 200 } })
    useYTDLiveChatNoLsStore.setState({ clip: { header: 2, input: 1 } })

    const setCoordinates = vi.fn()
    const setSize = vi.fn()
    const { result } = renderHook(() => useClipPathManagement({ setCoordinates, setSize, iframeElement: null }))

    act(() => {
      result.current.handleClipPathChange(true, { header: 12, input: 8 })
    })

    expect(setCoordinates).toHaveBeenCalledWith({ x: 10, y: 8 })
    expect(setSize).toHaveBeenCalledWith({ width: 300, height: 220 })
  })
})
