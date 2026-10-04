import { act, cleanup, renderHook } from '@testing-library/react'
import { Provider } from 'jotai'
import { createStore } from 'jotai/vanilla'
import { createElement, Profiler, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layoutGeometryToV2 } from '@/shared/settings/chatGeometry'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import { collectPlayerObstacles, type PlayerObstacle } from '../platform/youtube/collectPlayerObstacles'
import { useOverlayGeometry } from './useOverlayGeometry'

vi.mock('../platform/youtube/collectPlayerObstacles', () => ({ collectPlayerObstacles: vi.fn(() => []) }))

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const setup = () => {
  const store = createStore()
  const player = document.createElement('div')
  const controls = document.createElement('div')
  controls.className = 'ytp-chrome-bottom'
  const caption = document.createElement('div')
  caption.className = 'caption-window'
  const captionText = document.createTextNode('Initial caption')
  caption.append(captionText)
  player.append(controls, caption)
  document.body.append(player)
  let width = 1000
  player.getBoundingClientRect = () => ({ width, height: 700 }) as DOMRect
  store.set(chatSettingsStateAtom, {
    ...DEFAULT_CHAT_SETTINGS,
    geometry: layoutGeometryToV2({ coordinates: { x: 10, y: 10 }, size: { width: 300, height: 200 } }, { width, height: 700 }, false),
  })
  let obstacles: PlayerObstacle[] = [{ kind: 'controls', rect: { x: 0, y: 660, width, height: 40 } }]
  vi.mocked(collectPlayerObstacles).mockImplementation(() => structuredClone(obstacles))
  let renders = 0
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(Provider, { store }, createElement(Profiler, { id: 'overlay', onRender: () => (renders += 1) }, children))
  const hook = renderHook(
    ({ settingsOpen, interactionState }: { settingsOpen: boolean; interactionState: 'idle' | 'hovering-chat' }) => {
      return useOverlayGeometry({ referenceElement: player, settingsOpen, interactionState })
    },
    { wrapper, initialProps: { settingsOpen: false, interactionState: 'idle' } },
  )
  return {
    ...hook,
    player,
    controls,
    caption,
    captionText,
    renderCount: () => renders,
    setObstacles: (next: PlayerObstacle[]) => {
      obstacles = next
    },
    resize: () => {
      width = 900
      window.dispatchEvent(new Event('resize'))
    },
  }
}

const deliverMutation = async (change: () => void) => {
  await act(async () => {
    change()
    await Promise.resolve()
  })
}

const advanceFrame = () => act(() => vi.advanceTimersToNextFrame())

describe('automatic placement work during player updates', () => {
  it('does not render the overlay for 100 progress updates with unchanged obstacle bounds', async () => {
    const { controls, renderCount } = setup()
    const initialRenders = renderCount()
    const initialMeasurements = vi.mocked(collectPlayerObstacles).mock.calls.length

    for (let index = 0; index < 100; index += 1) {
      await deliverMutation(() => controls.style.setProperty('--progress', String(index)))
      advanceFrame()
    }

    expect(collectPlayerObstacles).toHaveBeenCalledTimes(initialMeasurements + 100)
    expect(renderCount()).toBe(initialRenders)
  })

  it.each(['style', 'childList', 'characterData'] as const)(
    'repositions after %s changes a caption obstacle without measuring twice',
    async mutation => {
      const { result, caption, captionText, setObstacles } = setup()
      const initialMeasurements = vi.mocked(collectPlayerObstacles).mock.calls.length
      setObstacles([{ kind: 'caption', rect: { x: 0, y: 0, width: 400, height: 600 } }])

      await deliverMutation(() => {
        if (mutation === 'style') caption.style.height = '600px'
        else if (mutation === 'childList') caption.append(document.createElement('span'))
        else captionText.data = 'A caption that changes the occupied area'
      })
      advanceFrame()

      expect(result.current.displayGeometry.coordinates).toEqual({ x: 690, y: 10 })
      expect(collectPlayerObstacles).toHaveBeenCalledTimes(initialMeasurements + 1)
    },
  )

  it('does not remeasure unchanged obstacles on unrelated renders or interaction changes', () => {
    const { rerender } = setup()
    const initialMeasurements = vi.mocked(collectPlayerObstacles).mock.calls.length

    rerender({ settingsOpen: false, interactionState: 'idle' })
    rerender({ settingsOpen: false, interactionState: 'hovering-chat' })
    rerender({ settingsOpen: false, interactionState: 'idle' })

    expect(collectPlayerObstacles).toHaveBeenCalledTimes(initialMeasurements)
  })

  it('refreshes obstacle measurements when settings or player size changes', () => {
    const { rerender, resize } = setup()
    const initialMeasurements = vi.mocked(collectPlayerObstacles).mock.calls.length

    rerender({ settingsOpen: true, interactionState: 'idle' })
    expect(collectPlayerObstacles).toHaveBeenLastCalledWith(expect.any(HTMLElement), true)
    expect(collectPlayerObstacles).toHaveBeenCalledTimes(initialMeasurements + 1)

    act(resize)
    expect(collectPlayerObstacles).toHaveBeenCalledTimes(initialMeasurements + 2)
  })

  it('defers automatic placement while a pointer gesture is active and applies fresh bounds after cancellation', async () => {
    const { result, captionText, setObstacles } = setup()
    const handle = document.createElement('button')
    const initialMeasurements = vi.mocked(collectPlayerObstacles).mock.calls.length
    act(() =>
      result.current.onPointerDown({
        button: 0,
        pointerId: 1,
        clientX: 0,
        clientY: 0,
        currentTarget: handle,
        preventDefault: () => {},
      } as unknown as React.PointerEvent),
    )
    act(() => window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 30, clientY: 30 })))
    advanceFrame()
    setObstacles([{ kind: 'caption', rect: { x: 0, y: 0, width: 400, height: 600 } }])
    await deliverMutation(() => {
      captionText.data = 'Expanded caption during a drag'
    })
    advanceFrame()

    expect(result.current.displayGeometry.coordinates).toEqual({ x: 40, y: 40 })

    act(() => window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })))

    expect(result.current.draftGeometry).toBeNull()
    expect(result.current.displayGeometry.coordinates).toEqual({ x: 690, y: 10 })
    expect(collectPlayerObstacles).toHaveBeenCalledTimes(initialMeasurements + 1)
  })

  it('cancels a pending obstacle measurement when the overlay unmounts', async () => {
    const { controls, unmount } = setup()
    const initialMeasurements = vi.mocked(collectPlayerObstacles).mock.calls.length
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame')

    await deliverMutation(() => (controls.style.height = '50px'))
    unmount()
    advanceFrame()

    expect(cancelFrame).toHaveBeenCalledOnce()
    expect(collectPlayerObstacles).toHaveBeenCalledTimes(initialMeasurements)
  })
})
