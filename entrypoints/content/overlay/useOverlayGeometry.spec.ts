import { act, renderHook } from '@testing-library/react'
import { Provider } from 'jotai'
import { createStore } from 'jotai/vanilla'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_GEOMETRY } from '@/shared/settings/defaults'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { LegacyChatGeometry } from '@/shared/settings/model'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import type { ResizeDirection } from '../features/Draggable/hooks/clipGeometry'
import { mutationTouchesPlayerObstacle } from './useAutomaticOverlayPlacement'
import { useOverlayGeometry } from './useOverlayGeometry'

const flushAnimationFrame = () =>
  act(async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  })

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

  const setLayout = (coordinates = { x: 100, y: 50 }, size = { width: 300, height: 200 }, pinned = true) => {
    store.set(chatSettingsStateAtom, {
      ...DEFAULT_CHAT_SETTINGS,
      geometry: {
        reference: 'player',
        rect: {
          x: coordinates.x / reference.width,
          y: coordinates.y / reference.height,
          width: size.width / reference.width,
          height: size.height / reference.height,
        },
        pinned,
      },
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
  afterEach(() => player.remove())

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

  it('reports only the directions and size changes that can alter the fitted layout', () => {
    setLayout({ x: 10, y: 10 }, { width: 240, height: 180 })
    const { result } = renderGeometryHook()
    expect(result.current.canMoveBy({ x: -10, y: 0 })).toBe(false)
    expect(result.current.canMoveBy({ x: 0, y: -10 })).toBe(false)
    expect(result.current.canMoveBy({ x: 10, y: 0 })).toBe(true)
    expect(result.current.canMoveBy({ x: 0, y: 10 })).toBe(true)
    expect(result.current.canResizeBy({ width: -10, height: 0 })).toBe(false)
    expect(result.current.canResizeBy({ width: 0, height: -10 })).toBe(false)
    act(() => setLayout({ x: 165, y: 40 }, { width: 325, height: 450 }))
    expect(result.current.canMoveBy({ x: 10, y: 0 })).toBe(false)
    expect(result.current.canMoveBy({ x: 0, y: 10 })).toBe(false)
    expect(result.current.canResizeBy({ width: 10, height: 0 })).toBe(false)
    expect(result.current.canResizeBy({ width: 0, height: 10 })).toBe(false)
    act(() => result.current.resizeBy({ width: 10, height: 10 }))
    expect(result.current.displayGeometry).toEqual({ coordinates: { x: 165, y: 40 }, size: { width: 325, height: 450 } })
  })

  it('restores the opening geometry and pin intent, and recaptures each new adjustment session', () => {
    setLayout({ x: 100, y: 50 }, { width: 300, height: 200 }, false)
    const original = store.get(chatSettingsStateAtom).geometry
    const { result } = renderGeometryHook()
    act(() => result.current.onAdjustmentOpenChange(true))
    expect(result.current.canRestoreAdjustment).toBe(false)
    act(() => result.current.moveBy({ x: 20, y: 10 }))
    act(() => result.current.resizeBy({ width: -20, height: 30 }))
    expect(result.current.canRestoreAdjustment).toBe(true)
    act(() => result.current.restoreAdjustment())
    expect(store.get(chatSettingsStateAtom).geometry).toEqual(original)
    expect(result.current.canRestoreAdjustment).toBe(false)
    act(() => result.current.moveBy({ x: 10, y: 0 }))
    const second = store.get(chatSettingsStateAtom).geometry
    act(() => result.current.onAdjustmentOpenChange(false))
    act(() => result.current.onAdjustmentOpenChange(true))
    act(() => result.current.moveBy({ x: 10, y: 0 }))
    act(() => result.current.restoreAdjustment())
    expect(store.get(chatSettingsStateAtom).geometry).toEqual(second)
  })

  it('keeps Restore disabled when the same geometry arrives with a different property order', () => {
    const { result } = renderGeometryHook()
    act(() => result.current.onAdjustmentOpenChange(true))
    act(() => {
      const current = store.get(chatSettingsStateAtom)
      const geometry = current.geometry
      if (geometry.reference !== 'player') throw new Error('Expected player-relative geometry')
      store.set(chatSettingsStateAtom, {
        ...current,
        geometry: {
          pinned: geometry.pinned,
          rect: { height: geometry.rect.height, width: geometry.rect.width, y: geometry.rect.y, x: geometry.rect.x },
          reference: 'player',
        },
      })
    })
    expect(result.current.canRestoreAdjustment).toBe(false)
    act(() => result.current.moveBy({ x: 10, y: 0 }))
    expect(result.current.canRestoreAdjustment).toBe(true)
  })

  it('commits keyboard movement as pinned player ratios', () => {
    const { result } = renderGeometryHook()
    act(() => result.current.moveBy({ x: 25, y: 10 }))
    expect(result.current.displayGeometry.coordinates).toEqual({ x: 125, y: 60 })
    expect(store.get(chatSettingsStateAtom).geometry).toEqual({
      reference: 'player',
      rect: { x: 0.25, y: 0.12, width: 0.6, height: 0.4 },
      pinned: true,
    })
  })

  it('commits one geometry update when a drag ends', async () => {
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
    await flushAnimationFrame()
    expect(result.current.draftGeometry?.coordinates).toEqual({ x: 125, y: 60 })
    act(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, clientX: 25, clientY: 10 })))
    expect(result.current.displayGeometry.coordinates).toEqual({ x: 125, y: 60 })
    expect(store.get(chatSettingsStateAtom).geometry).toEqual({
      reference: 'player',
      rect: { x: 0.25, y: 0.12, width: 0.6, height: 0.4 },
      pinned: true,
    })
  })

  it('uses the final pointer-up coordinates even when no pointermove was delivered', () => {
    const { result } = renderGeometryHook()
    const handle = document.createElement('div')
    const pointerDown = {
      button: 0,
      pointerId: 7,
      clientX: 0,
      clientY: 0,
      currentTarget: handle,
      preventDefault: () => {},
    } as unknown as React.PointerEvent<HTMLDivElement>

    act(() => result.current.onPointerDown(pointerDown))
    act(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, clientX: 30, clientY: 15 })))

    expect(result.current.displayGeometry.coordinates).toEqual({ x: 130, y: 65 })
    expect(store.get(chatSettingsStateAtom).geometry).toEqual({
      reference: 'player',
      rect: { x: 0.26, y: 0.13, width: 0.6, height: 0.4 },
      pinned: true,
    })
  })

  it('keeps pointer resize updates in a draft and commits once on pointer up', async () => {
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
    await flushAnimationFrame()
    expect(result.current.draftGeometry?.size).toEqual({ width: 340, height: 240 })
    act(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 40, clientY: 40 })))
    expect(result.current.displayGeometry.size).toEqual({ width: 340, height: 240 })
    expect(store.get(chatSettingsStateAtom).geometry).toEqual({
      reference: 'player',
      rect: { x: 0.125, y: 50 / 600, width: 0.425, height: 0.4 },
      pinned: true,
    })
  })

  it('keeps the opposite edges fixed while resizing from the bottom-left handle', async () => {
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
    await flushAnimationFrame()
    expect(result.current.draftGeometry).toEqual({ coordinates: { x: 60, y: 50 }, size: { width: 440, height: 220 } })
    act(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, clientX: 60, clientY: 120 })))
    expect(result.current.displayGeometry.coordinates).toEqual({ x: 60, y: 50 })
    expect(result.current.displayGeometry.size.width).toBeCloseTo(440, 10)
    expect(result.current.displayGeometry.size.height).toBeCloseTo(220, 10)
    expect(store.get(chatSettingsStateAtom).geometry).toEqual({
      reference: 'player',
      rect: { x: 0.075, y: 50 / 600, width: 0.55, height: 220 / 600 },
      pinned: true,
    })
  })

  it.each([
    {
      name: 'width ratio limit',
      direction: 'right',
      coordinates: { x: 100, y: 50 },
      size: { width: 650, height: 200 },
      delta: { x: 100, y: 30 },
      expected: { coordinates: { x: 100, y: 50 }, size: { width: 650, height: 200 } },
    },
    {
      name: 'height ratio limit',
      direction: 'bottom',
      coordinates: { x: 100, y: 50 },
      size: { width: 300, height: 720 },
      delta: { x: 20, y: 60 },
      expected: { coordinates: { x: 100, y: 50 }, size: { width: 300, height: 720 } },
    },
    {
      name: 'left edge at the width ratio limit',
      direction: 'left',
      coordinates: { x: 500, y: 100 },
      size: { width: 300, height: 200 },
      delta: { x: -600, y: 30 },
      expected: { coordinates: { x: 150, y: 100 }, size: { width: 650, height: 200 } },
    },
    {
      name: 'top edge at the height ratio limit',
      direction: 'top',
      coordinates: { x: 100, y: 500 },
      size: { width: 300, height: 280 },
      delta: { x: 30, y: -700 },
      expected: { coordinates: { x: 100, y: 60 }, size: { width: 300, height: 720 } },
    },
    {
      name: 'right edge at the padded viewport boundary',
      direction: 'right',
      coordinates: { x: 700, y: 100 },
      size: { width: 240, height: 200 },
      delta: { x: 300, y: 30 },
      expected: { coordinates: { x: 700, y: 100 }, size: { width: 290, height: 200 } },
    },
    {
      name: 'bottom edge at the padded viewport boundary',
      direction: 'bottom',
      coordinates: { x: 100, y: 500 },
      size: { width: 300, height: 200 },
      delta: { x: 30, y: 300 },
      expected: { coordinates: { x: 100, y: 500 }, size: { width: 300, height: 290 } },
    },
    {
      name: 'left edge at the padded viewport boundary',
      direction: 'left',
      coordinates: { x: 50, y: 100 },
      size: { width: 300, height: 200 },
      delta: { x: -300, y: 30 },
      expected: { coordinates: { x: 10, y: 100 }, size: { width: 340, height: 200 } },
    },
    {
      name: 'top edge at the padded viewport boundary',
      direction: 'top',
      coordinates: { x: 100, y: 50 },
      size: { width: 300, height: 200 },
      delta: { x: 30, y: -300 },
      expected: { coordinates: { x: 100, y: 10 }, size: { width: 300, height: 240 } },
    },
  ] satisfies {
    name: string
    direction: ResizeDirection
    coordinates: { x: number; y: number }
    size: { width: number; height: number }
    delta: { x: number; y: number }
    expected: { coordinates: { x: number; y: number }; size: { width: number; height: number } }
  }[])('keeps preview and committed geometry identical at the $name', async ({ direction, coordinates, size, delta, expected }) => {
    setPlayerSize(1000, 800)
    setLayout(coordinates, size)
    const { result } = renderGeometryHook()
    const handle = document.createElement('div')
    handle.dataset.ylcResizeDirection = direction
    act(() =>
      result.current.onPointerDown({
        button: 0,
        pointerId: 11,
        clientX: 0,
        clientY: 0,
        currentTarget: handle,
        preventDefault: () => {},
      } as unknown as React.PointerEvent<HTMLDivElement>),
    )
    act(() => window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 11, clientX: delta.x, clientY: delta.y })))
    await flushAnimationFrame()
    expect(result.current.draftGeometry).toEqual(expected)

    act(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 11, clientX: delta.x, clientY: delta.y })))

    expect(result.current.draftGeometry).toBeNull()
    expect(result.current.displayGeometry).toEqual(expected)
  })

  it('uses the same anchored resize cap when pointer-up arrives without a preceding move', () => {
    setPlayerSize(1000, 800)
    setLayout({ x: 500, y: 100 }, { width: 300, height: 200 })
    const { result } = renderGeometryHook()
    const handle = document.createElement('div')
    handle.dataset.ylcResizeDirection = 'left'
    act(() =>
      result.current.onPointerDown({
        button: 0,
        pointerId: 12,
        clientX: 0,
        clientY: 0,
        currentTarget: handle,
        preventDefault: () => {},
      } as unknown as React.PointerEvent<HTMLDivElement>),
    )

    act(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 12, clientX: -600, clientY: 30 })))

    expect(result.current.displayGeometry).toEqual({ coordinates: { x: 150, y: 100 }, size: { width: 650, height: 200 } })
  })

  it('does not observe player mutations for pinned geometry', () => {
    const observe = vi.spyOn(MutationObserver.prototype, 'observe')

    renderGeometryHook()

    expect(observe).not.toHaveBeenCalled()
  })

  it('observes player mutations only while automatic placement is active', () => {
    setLayout({ x: 100, y: 50 }, { width: 300, height: 200 }, false)
    const observe = vi.spyOn(MutationObserver.prototype, 'observe')

    renderGeometryHook()

    expect(observe).toHaveBeenCalledWith(
      player,
      expect.objectContaining({
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      }),
    )
  })

  it('defers automatic placement during a native purchase and resumes afterward', () => {
    setLayout({ x: 100, y: 50 }, { width: 300, height: 200 }, false)
    const saved = store.get(chatSettingsStateAtom).geometry
    const caption = document.createElement('div')
    caption.className = 'ytp-caption-window-container'
    caption.getBoundingClientRect = () =>
      ({ x: 100, y: 50, left: 100, top: 50, right: 400, bottom: 250, width: 300, height: 200 }) as DOMRect
    player.append(caption)
    const { rerender } = renderHook(({ paused }) => useOverlayGeometry({ referenceElement: player, automaticPlacementPaused: paused }), {
      initialProps: { paused: true },
      wrapper,
    })
    expect(store.get(chatSettingsStateAtom).geometry).toEqual(saved)
    rerender({ paused: false })
    expect(store.get(chatSettingsStateAtom).geometry).not.toEqual(saved)
    expect(store.get(chatSettingsStateAtom).geometry).toMatchObject({ pinned: false })
  })

  it('rechecks a stationary obstacle when the player resizes an unpinned chat into it', () => {
    setLayout({ x: 50, y: 50 }, { width: 240, height: 180 }, false)
    const caption = document.createElement('div')
    caption.className = 'ytp-caption-window-container'
    caption.getBoundingClientRect = () => new DOMRect(300, 50, 200, 200)
    player.append(caption)
    const saved = store.get(chatSettingsStateAtom).geometry
    const { result } = renderGeometryHook()
    expect(store.get(chatSettingsStateAtom).geometry).toEqual(saved)

    act(() => {
      setPlayerSize(800, 800)
      window.dispatchEvent(new Event('resize'))
    })

    expect(store.get(chatSettingsStateAtom).geometry).not.toEqual(saved)
    expect(result.current.displayGeometry.coordinates.y).toBeCloseTo(502)
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
    expect(store.get(chatSettingsStateAtom).geometry).toEqual({
      reference: 'player',
      rect: { x: 0.2, y: 0.1, width: 0.6, height: 0.4 },
      pinned: true,
    })
  })

  it('starts from the player-relative settings default when reset by the store', () => {
    store.set(chatSettingsStateAtom, { ...store.get(chatSettingsStateAtom), geometry: DEFAULT_CHAT_GEOMETRY })
    const { result } = renderGeometryHook()
    expect(result.current.displayGeometry.coordinates.x).toBe(10)
    expect(result.current.displayGeometry.coordinates.y).toBeCloseTo(13.889, 6)
    expect(result.current.displayGeometry.size.width).toBe(240)
    expect(result.current.displayGeometry.size.height).toBeCloseTo(277.778, 6)
  })
})

describe('mutationTouchesPlayerObstacle', () => {
  it('ignores unrelated subtree changes and recognizes obstacle boundary changes', () => {
    const player = document.createElement('div')
    const controls = document.createElement('div')
    controls.className = 'ytp-chrome-bottom'
    player.appendChild(controls)

    const unrelated = document.createElement('span')
    const unrelatedMutation = {
      type: 'childList',
      target: player,
      addedNodes: [unrelated],
      removedNodes: [],
    } as unknown as MutationRecord
    expect(mutationTouchesPlayerObstacle(unrelatedMutation, player)).toBe(false)

    const caption = document.createElement('div')
    caption.className = 'ytp-caption-window-container'
    const boundaryMutation = {
      type: 'childList',
      target: player,
      addedNodes: [caption],
      removedNodes: [],
    } as unknown as MutationRecord
    expect(mutationTouchesPlayerObstacle(boundaryMutation, player)).toBe(true)

    const attributeMutation = {
      type: 'attributes',
      target: controls,
    } as unknown as MutationRecord
    expect(mutationTouchesPlayerObstacle(attributeMutation, player)).toBe(true)

    const hiddenMenu = document.createElement('div')
    hiddenMenu.className = 'ytp-popup ytp-settings-menu-hidden'
    player.appendChild(hiddenMenu)
    const hiddenMenuMutation = {
      type: 'attributes',
      target: hiddenMenu,
    } as unknown as MutationRecord
    expect(mutationTouchesPlayerObstacle(hiddenMenuMutation, player)).toBe(true)
  })

  it('recognizes text and nested child changes inside a player obstacle', () => {
    const player = document.createElement('div')
    const caption = document.createElement('div')
    caption.className = 'caption-window'
    const inner = document.createElement('span')
    const text = document.createTextNode('caption')
    inner.appendChild(text)
    caption.appendChild(inner)
    player.appendChild(caption)

    const characterDataMutation = {
      type: 'characterData',
      target: text,
      addedNodes: [],
      removedNodes: [],
    } as unknown as MutationRecord
    expect(mutationTouchesPlayerObstacle(characterDataMutation, player)).toBe(true)

    const nestedChildMutation = {
      type: 'childList',
      target: inner,
      addedNodes: [document.createTextNode(' updated')],
      removedNodes: [],
    } as unknown as MutationRecord
    expect(mutationTouchesPlayerObstacle(nestedChildMutation, player)).toBe(true)
  })
})
