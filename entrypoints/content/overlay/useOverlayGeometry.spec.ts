import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { DEFAULT_CHAT_GEOMETRY } from '@/shared/settings/defaults'
import { useOverlayGeometry } from './useOverlayGeometry'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

describe('useOverlayGeometry', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 500, writable: true, configurable: true })
    useChatSettingsStore.setState({
      geometry: {
        coordinates: { x: 100, y: 50 },
        size: { width: 300, height: 200 },
      },
      commitGeometry: useChatSettingsStore.getInitialState().commitGeometry,
    })
  })

  it('clamps display geometry locally when the viewport changes without persisting', () => {
    const commitGeometry = vi.fn()
    useChatSettingsStore.setState({
      geometry: {
        coordinates: { x: 300, y: 50 },
        size: { width: 300, height: 200 },
      },
      commitGeometry,
    })
    const { result } = renderHook(() => useOverlayGeometry())

    expect(result.current.displayGeometry.coordinates).toEqual({ x: 190, y: 50 })

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 400, writable: true, configurable: true })
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current.displayGeometry.coordinates).toEqual({ x: 90, y: 50 })
    expect(commitGeometry).not.toHaveBeenCalled()
  })

  it('commits one geometry update when a drag ends', () => {
    const commitGeometry = vi.fn()
    useChatSettingsStore.setState({ commitGeometry })
    const { result } = renderHook(() => useOverlayGeometry())

    act(() => {
      result.current.finishDragging({
        delta: { x: 25, y: 10 },
      } as Parameters<typeof result.current.finishDragging>[0])
    })

    expect(commitGeometry).toHaveBeenCalledOnce()
    expect(commitGeometry).toHaveBeenCalledWith({
      coordinates: { x: 125, y: 60 },
      size: { width: 300, height: 200 },
    })
  })

  it('keeps resize updates in a draft and commits once on resize stop', () => {
    const commitGeometry = vi.fn()
    useChatSettingsStore.setState({ commitGeometry })
    const { result } = renderHook(() => useOverlayGeometry())
    const element = document.createElement('div')
    Object.defineProperty(element, 'offsetWidth', { value: 340 })
    Object.defineProperty(element, 'offsetHeight', { value: 240 })

    act(() => result.current.startResizing())
    act(() => {
      result.current.resize(new MouseEvent('mousemove'), 'bottomRight', element, { width: 40, height: 40 })
    })

    expect(result.current.draftGeometry).toEqual({
      coordinates: { x: 100, y: 50 },
      size: { width: 340, height: 240 },
    })
    expect(commitGeometry).not.toHaveBeenCalled()

    act(() => {
      result.current.finishResizing(new MouseEvent('mouseup'), 'bottomRight', element, { width: 40, height: 40 })
    })

    expect(commitGeometry).toHaveBeenCalledOnce()
    expect(commitGeometry).toHaveBeenCalledWith({
      coordinates: { x: 100, y: 50 },
      size: { width: 340, height: 240 },
    })
  })

  it('starts from the settings default shape when reset by the store', () => {
    useChatSettingsStore.setState({ geometry: DEFAULT_CHAT_GEOMETRY })
    const { result } = renderHook(() => useOverlayGeometry())

    expect(result.current.displayGeometry.size).toEqual(DEFAULT_CHAT_GEOMETRY.size)
  })
})
