import { act, renderHook } from '@testing-library/react'
import { Provider } from 'jotai'
import { createStore } from 'jotai/vanilla'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layoutGeometryToV2, renderChatGeometry } from '@/shared/settings/chatGeometry'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import { useOverlayGeometry } from './useOverlayGeometry'

const rect = (x: number, y: number, width: number, height: number): DOMRect => ({
  x,
  y,
  left: x,
  top: y,
  right: x + width,
  bottom: y + height,
  width,
  height,
  toJSON: () => ({}),
})

describe('automatic placement measurements', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  const setup = (overlapping = false) => {
    const store = createStore()
    const player = document.createElement('div')
    const caption = document.createElement('div')
    caption.className = 'caption-window'
    caption.textContent = 'caption'
    player.appendChild(caption)
    document.body.appendChild(player)
    const playerBounds = vi.spyOn(player, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 1000, 600))
    const captionBounds = vi
      .spyOn(caption, 'getBoundingClientRect')
      .mockReturnValue(overlapping ? rect(20, 10, 240, 180) : rect(500, 400, 100, 40))
    store.set(chatSettingsStateAtom, {
      ...DEFAULT_CHAT_SETTINGS,
      geometry: layoutGeometryToV2(
        { coordinates: { x: 20, y: 10 }, size: { width: 240, height: 180 } },
        { width: 1000, height: 600 },
        false,
      ),
    })
    const wrapper = ({ children }: { children: ReactNode }) => createElement(Provider, { store }, children)
    const hook = renderHook(({ settingsOpen }) => useOverlayGeometry({ referenceElement: player, settingsOpen }), {
      wrapper,
      initialProps: { settingsOpen: false },
    })
    return { store, player, caption, playerBounds, captionBounds, ...hook }
  }

  const flushObstacleChanges = async () => {
    await act(async () => {
      await Promise.resolve()
    })
    act(() => vi.advanceTimersByTime(20))
  }

  it('does not measure obstacles again on unrelated parent renders', () => {
    const { result, rerender, captionBounds, unmount, player } = setup()
    const initialGeometry = result.current.displayGeometry
    expect(captionBounds).toHaveBeenCalledOnce()

    for (let i = 0; i < 100; i++) rerender({ settingsOpen: false })

    expect(captionBounds).toHaveBeenCalledOnce()
    expect(result.current.displayGeometry).toBe(initialGeometry)
    unmount()
    player.remove()
  })

  it('still measures caption text, visibility, settings and player size changes', async () => {
    const { caption, captionBounds, playerBounds, rerender, unmount, player } = setup()
    expect(captionBounds).toHaveBeenCalledOnce()

    caption.textContent = 'updated caption'
    await flushObstacleChanges()
    expect(captionBounds).toHaveBeenCalledTimes(2)

    caption.style.visibility = 'hidden'
    await flushObstacleChanges()
    expect(captionBounds).toHaveBeenCalledTimes(3)

    rerender({ settingsOpen: true })
    expect(captionBounds).toHaveBeenCalledTimes(4)

    playerBounds.mockReturnValue(rect(0, 0, 1100, 700))
    act(() => window.dispatchEvent(new Event('resize')))
    expect(captionBounds).toHaveBeenCalledTimes(5)
    unmount()
    player.remove()
  })

  it('stops measuring after the allowed automatic reposition while preserving the chosen geometry', async () => {
    const { store, caption, captionBounds, rerender, unmount, player } = setup(true)
    const placedGeometry = store.get(chatSettingsStateAtom).geometry
    expect(renderChatGeometry(placedGeometry, { width: 1000, height: 600 }).coordinates).not.toEqual({ x: 20, y: 10 })
    captionBounds.mockClear()

    for (let i = 0; i < 100; i++) rerender({ settingsOpen: i % 2 === 0 })
    caption.textContent = 'later caption'
    await flushObstacleChanges()

    expect(captionBounds).not.toHaveBeenCalled()
    expect(store.get(chatSettingsStateAtom).geometry).toBe(placedGeometry)
    unmount()
    player.remove()
  })
})
