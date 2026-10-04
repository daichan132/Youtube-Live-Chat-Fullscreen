import { act, renderHook } from '@testing-library/react'
import { Provider } from 'jotai'
import { createStore } from 'jotai/vanilla'
import { createElement, type ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { layoutGeometryToV2 } from '@/shared/settings/chatGeometry'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import { collectPlayerObstacles } from '../platform/youtube/collectPlayerObstacles'
import { useOverlayGeometry } from './useOverlayGeometry'

vi.mock('../platform/youtube/collectPlayerObstacles', () => ({ collectPlayerObstacles: vi.fn(() => []) }))
afterEach(() => vi.restoreAllMocks())
const setup = (pinned = true) => {
  const store = createStore()
  const player = document.createElement('div')
  let width = 1000
  player.getBoundingClientRect = () => ({ width, height: 700 }) as DOMRect
  store.set(chatSettingsStateAtom, {
    ...DEFAULT_CHAT_SETTINGS,
    geometry: layoutGeometryToV2({ coordinates: { x: 10, y: 10 }, size: { width: 300, height: 200 } }, { width, height: 700 }, pinned),
  })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(Provider, { store }, children)
  return {
    store,
    player,
    wrapper,
    resize: () => {
      width = 900
      window.dispatchEvent(new Event('resize'))
    },
  }
}

it('does not write at a boundary, and commits each size adjustment while Escape leaves it intact', () => {
  const { store, player, wrapper } = setup()
  const changed = vi.fn()
  const unsubscribe = store.sub(chatSettingsStateAtom, changed)
  const { result } = renderHook(() => useOverlayGeometry({ referenceElement: player }), { wrapper })
  act(() => result.current.moveBy({ x: -10, y: -10 }))
  expect(changed).not.toHaveBeenCalled()
  act(() => result.current.resizeBy({ width: 10, height: 0 }))
  expect(result.current.displayGeometry.size).toEqual({ width: 310, height: 200 })
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
  expect(changed).toHaveBeenCalledOnce()
  unsubscribe()
})

it('disconnects obstacle observation after placement and keeps size updates without collecting again', () => {
  const { player, wrapper, resize } = setup(false)
  vi.mocked(collectPlayerObstacles).mockReturnValue([{ kind: 'caption', rect: { x: 0, y: 0, width: 400, height: 300 } }])
  const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect')
  const { result } = renderHook(() => useOverlayGeometry({ referenceElement: player }), { wrapper })
  expect(disconnect).toHaveBeenCalled()
  const count = vi.mocked(collectPlayerObstacles).mock.calls.length
  act(resize)
  expect(result.current.viewport.width).toBe(900)
  expect(collectPlayerObstacles).toHaveBeenCalledTimes(count)
})

it('renders the initial legacy migration before a resize and moves from the migrated player ratios', () => {
  const { store, player, wrapper, resize } = setup()
  store.set(chatSettingsStateAtom, {
    ...DEFAULT_CHAT_SETTINGS,
    geometry: { reference: 'legacy-viewport-px', coordinates: { x: 100, y: 50 }, size: { width: 300, height: 200 } },
  })
  const changed = vi.fn()
  const unsubscribe = store.sub(chatSettingsStateAtom, changed)
  const { result } = renderHook(() => useOverlayGeometry({ referenceElement: player }), { wrapper })

  expect(store.get(chatSettingsStateAtom).geometry).toEqual(
    layoutGeometryToV2({ coordinates: { x: 100, y: 50 }, size: { width: 300, height: 200 } }, { width: 1000, height: 700 }, true),
  )
  expect(result.current.displayGeometry).toEqual({ coordinates: { x: 100, y: 50 }, size: { width: 300, height: 200 } })
  expect(changed).toHaveBeenCalledOnce()

  act(resize)
  expect(result.current.displayGeometry).toEqual({ coordinates: { x: 90, y: 50 }, size: { width: 270, height: 200 } })
  expect(changed).toHaveBeenCalledOnce()

  act(() => result.current.moveBy({ x: 25, y: 10 }))
  expect(result.current.displayGeometry.coordinates.x).toBeCloseTo(115, 10)
  expect(result.current.displayGeometry.coordinates.y).toBe(60)
  expect(result.current.displayGeometry.size).toEqual({ width: 270, height: 200 })
  expect(store.get(chatSettingsStateAtom).geometry).toEqual(
    layoutGeometryToV2({ coordinates: { x: 115, y: 60 }, size: { width: 270, height: 200 } }, { width: 900, height: 700 }, true),
  )
  expect(changed).toHaveBeenCalledTimes(2)
  unsubscribe()
})
