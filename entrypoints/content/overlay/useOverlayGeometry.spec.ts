import { act, renderHook } from '@testing-library/react'
import { Provider } from 'jotai'
import { createStore } from 'jotai/vanilla'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { layoutGeometryToV2, renderChatGeometry } from '@/shared/settings/chatGeometry'
import { DEFAULT_CHAT_GEOMETRY } from '@/shared/settings/defaults'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { LegacyChatGeometry } from '@/shared/settings/model'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import { useOverlayGeometry } from './useOverlayGeometry'

describe('useOverlayGeometry', () => {
  const store = createStore()
  const wrapper = ({ children }: { children: ReactNode }) => createElement(Provider, { store }, children)
  let player: HTMLDivElement
  let reference = { width: 500, height: 500 }

  const setPlayerSize = (width: number, height: number) => {
    reference = { width, height }
    Object.defineProperty(player, 'clientWidth', { configurable: true, get: () => width })
    Object.defineProperty(player, 'clientHeight', { configurable: true, get: () => height })
  }

  const setLayout = (coordinates = { x: 100, y: 50 }, size = { width: 300, height: 200 }) => {
    store.set(chatSettingsStateAtom, {
      ...DEFAULT_CHAT_SETTINGS,
      geometry: layoutGeometryToV2({ coordinates, size }, reference, true),
    })
  }

  const renderGeometryHook = () => renderHook(() => useOverlayGeometry({ referenceElement: player }), { wrapper })

  beforeEach(() => {
    player = document.createElement('div')
    document.body.append(player)
    player.getBoundingClientRect = () =>
      ({ x: 0, y: 0, left: 0, top: 0, right: reference.width, bottom: reference.height, ...reference, toJSON: () => ({}) }) as DOMRect
    setPlayerSize(500, 500)
    setLayout()
  })

  it('renders ratios against player resizes and clamps the result locally', () => {
    setLayout({ x: 300, y: 50 }, { width: 300, height: 200 })
    const { result } = renderGeometryHook()
    expect(result.current.displayGeometry.coordinates).toEqual({ x: 190, y: 50 })
    act(() => {
      setPlayerSize(400, 400)
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current.displayGeometry).toEqual({ coordinates: { x: 150, y: 40 }, size: { width: 240, height: 180 } })
  })

  it('commits keyboard movement as pinned player ratios', () => {
    const { result } = renderGeometryHook()
    act(() => result.current.moveByKeyboard({ x: 25, y: 10 }))
    expect(renderChatGeometry(store.get(chatSettingsStateAtom).geometry, reference).coordinates).toEqual({ x: 125, y: 60 })
    expect(store.get(chatSettingsStateAtom).geometry).toMatchObject({ reference: 'player', pinned: true })
  })

  it('commits one geometry update when a drag ends', () => {
    const { result } = renderGeometryHook()
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
    expect(renderChatGeometry(store.get(chatSettingsStateAtom).geometry, reference).coordinates).toEqual({ x: 125, y: 60 })
  })

  it('keeps pointer resize updates in a draft and commits once on pointer up', () => {
    setPlayerSize(800, 600)
    setLayout()
    const { result } = renderGeometryHook()
    const handle = document.createElement('div')
    handle.dataset.ylcResizeDirection = 'bottomRight'
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
    expect(renderChatGeometry(store.get(chatSettingsStateAtom).geometry, reference).size).toEqual({ width: 340, height: 240 })
  })

  it('keeps the opposite edges fixed while resizing from the bottom-left handle', () => {
    setPlayerSize(800, 600)
    setLayout({ x: 100, y: 50 }, { width: 400, height: 200 })
    const { result } = renderGeometryHook()
    const handle = document.createElement('div')
    handle.dataset.ylcResizeDirection = 'bottomLeft'
    const pointerDown = {
      button: 0,
      pointerId: 3,
      clientX: 100,
      clientY: 100,
      currentTarget: handle,
      preventDefault: () => {},
    } as unknown as React.PointerEvent<HTMLDivElement>

    act(() => result.current.onPointerDown(pointerDown))
    act(() => window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 3, clientX: 60, clientY: 120 })))
    expect(result.current.draftGeometry).toEqual({ coordinates: { x: 60, y: 50 }, size: { width: 440, height: 220 } })
    act(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, clientX: 60, clientY: 120 })))
    const persisted = renderChatGeometry(store.get(chatSettingsStateAtom).geometry, reference)
    expect(persisted.coordinates.x).toBeCloseTo(60)
    expect(persisted.coordinates.y).toBeCloseTo(50)
    expect(persisted.size.width).toBeCloseTo(440)
    expect(persisted.size.height).toBeCloseTo(220)
  })

  it('keeps legacy pixels pending until the player is available, then migrates once as pinned ratios', () => {
    const legacy: LegacyChatGeometry = {
      reference: 'legacy-viewport-px',
      coordinates: { x: 100, y: 50 },
      size: { width: 300, height: 200 },
    }
    store.set(chatSettingsStateAtom, { ...store.get(chatSettingsStateAtom), geometry: legacy })
    const { result } = renderGeometryHook()
    expect(result.current.displayGeometry).toEqual({ coordinates: legacy.coordinates, size: legacy.size })
    expect(store.get(chatSettingsStateAtom).geometry).toEqual(
      layoutGeometryToV2({ coordinates: legacy.coordinates, size: legacy.size }, reference, true),
    )
  })

  it('starts from the player-relative settings default when reset by the store', () => {
    store.set(chatSettingsStateAtom, { ...store.get(chatSettingsStateAtom), geometry: DEFAULT_CHAT_GEOMETRY })
    const { result } = renderGeometryHook()
    expect(result.current.displayGeometry).toEqual({
      ...renderChatGeometry(DEFAULT_CHAT_GEOMETRY, reference),
      coordinates: { ...renderChatGeometry(DEFAULT_CHAT_GEOMETRY, reference).coordinates, x: 10 },
    })
  })
})
