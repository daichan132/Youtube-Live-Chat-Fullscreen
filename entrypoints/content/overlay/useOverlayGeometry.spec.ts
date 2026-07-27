import { act, renderHook } from '@testing-library/react'
import { Provider } from 'jotai'
import { createStore } from 'jotai/vanilla'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CHAT_GEOMETRY } from '@/shared/settings/defaults'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import { useOverlayGeometry } from './useOverlayGeometry'

describe('useOverlayGeometry', () => {
  const store = createStore()
  const wrapper = ({ children }: { children: ReactNode }) => createElement(Provider, { store }, children)
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 500, writable: true, configurable: true })
    store.set(chatSettingsStateAtom, {
      ...DEFAULT_CHAT_SETTINGS,
      geometry: { coordinates: { x: 100, y: 50 }, size: { width: 300, height: 200 } },
    })
  })

  it('clamps display geometry locally when the viewport changes', () => {
    store.set(chatSettingsStateAtom, {
      ...store.get(chatSettingsStateAtom),
      geometry: { coordinates: { x: 300, y: 50 }, size: { width: 300, height: 200 } },
    })
    const { result } = renderHook(() => useOverlayGeometry(), { wrapper })
    expect(result.current.displayGeometry.coordinates).toEqual({ x: 190, y: 50 })
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 400, writable: true, configurable: true })
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current.displayGeometry.coordinates).toEqual({ x: 90, y: 50 })
  })

  it('commits keyboard movement through the geometry atom', () => {
    const { result } = renderHook(() => useOverlayGeometry(), { wrapper })
    act(() => result.current.moveByKeyboard({ x: 25, y: 10 }))
    expect(store.get(chatSettingsStateAtom).geometry.coordinates).toEqual({ x: 125, y: 60 })
  })

  it('commits one geometry update when a drag ends', () => {
    const { result } = renderHook(() => useOverlayGeometry(), { wrapper })
    const handle = document.createElement('div')
    const pointerDown = {
      button: 0,
      pointerId: 2,
      clientX: 0,
      clientY: 0,
      currentTarget: handle,
      preventDefault: () => {},
    } as unknown as React.PointerEvent<HTMLDivElement>
    act(() => result.current.onPointerDown(pointerDown))
    act(() => window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, clientX: 25, clientY: 10 })))
    expect(result.current.draftGeometry?.coordinates).toEqual({ x: 125, y: 60 })
    act(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, clientX: 25, clientY: 10 })))
    expect(store.get(chatSettingsStateAtom).geometry.coordinates).toEqual({ x: 125, y: 60 })
  })

  it('keeps pointer resize updates in a draft and commits once on pointer up', () => {
    const { result } = renderHook(() => useOverlayGeometry(), { wrapper })
    const handle = document.createElement('div')
    handle.dataset.ylcResizeDirection = 'bottomRight'
    document.body.append(handle)
    const pointerDown = {
      button: 0,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
      currentTarget: handle,
      preventDefault: () => {},
    } as unknown as React.PointerEvent<HTMLDivElement>
    act(() => result.current.onPointerDown(pointerDown))
    act(() => window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 40, clientY: 40 })))
    expect(result.current.draftGeometry?.size).toEqual({ width: 340, height: 240 })
    act(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 40, clientY: 40 })))
    expect(store.get(chatSettingsStateAtom).geometry.size).toEqual({ width: 340, height: 240 })
  })

  it('starts from the settings default shape when reset by the store', () => {
    store.set(chatSettingsStateAtom, { ...store.get(chatSettingsStateAtom), geometry: DEFAULT_CHAT_GEOMETRY })
    const { result } = renderHook(() => useOverlayGeometry(), { wrapper })
    expect(result.current.displayGeometry.size).toEqual(DEFAULT_CHAT_GEOMETRY.size)
  })
})
