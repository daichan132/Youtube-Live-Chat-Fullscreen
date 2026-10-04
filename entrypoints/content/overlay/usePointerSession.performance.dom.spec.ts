import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePointerSession } from './usePointerSession'

const setupSession = () => {
  const session = { id: 'gesture' }
  const options = {
    begin: vi.fn(() => session),
    move: vi.fn(),
    commit: vi.fn(),
    cancel: vi.fn(),
    onStart: vi.fn(),
    onEnd: vi.fn(),
  }
  const hook = renderHook(() => usePointerSession(options))
  const handle = document.createElement('button')
  const releasePointerCapture = vi.fn()
  Object.assign(handle, { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture })
  const start = (pointerId = 1) =>
    act(() =>
      hook.result.current.onPointerDown({
        button: 0,
        pointerId,
        clientX: 0,
        clientY: 0,
        currentTarget: handle,
        preventDefault: () => {},
      } as unknown as React.PointerEvent),
    )
  const pointer = (type: string, x: number, y: number, pointerId = 1) =>
    act(() => window.dispatchEvent(new PointerEvent(type, { pointerId, clientX: x, clientY: y })))
  start()
  return { ...hook, options, session, handle, start, pointer, releasePointerCapture }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('pointer move frame scheduling', () => {
  it('delivers only the latest position once per frame while the gesture remains active', () => {
    const { pointer, options, session, result } = setupSession()
    for (let index = 0; index < 100; index += 1) pointer('pointermove', index, index + 10)

    expect(options.move).not.toHaveBeenCalled()
    expect(options.onStart).toHaveBeenCalledExactlyOnceWith(session)
    expect(result.current.isActive()).toBe(true)
    act(() => vi.advanceTimersToNextFrame())
    expect(options.move).toHaveBeenCalledExactlyOnceWith(session, { x: 99, y: 109 })

    pointer('pointermove', 200, 210)
    pointer('pointermove', 300, 310)
    act(() => vi.advanceTimersToNextFrame())
    expect(options.move).toHaveBeenCalledTimes(2)
    expect(options.move).toHaveBeenLastCalledWith(session, { x: 300, y: 310 })
    expect(options.commit).not.toHaveBeenCalled()
  })

  it('commits pointer-up coordinates and discards a pending preview before the frame runs', () => {
    const { pointer, options, session, result, releasePointerCapture } = setupSession()
    pointer('pointermove', 20, 30)
    pointer('pointerup', 40, 50)
    act(() => vi.advanceTimersToNextFrame())

    expect(options.move).not.toHaveBeenCalled()
    expect(options.commit).toHaveBeenCalledExactlyOnceWith(session, { x: 40, y: 50 })
    expect(options.cancel).not.toHaveBeenCalled()
    expect(options.onEnd).toHaveBeenCalledOnce()
    expect(releasePointerCapture).toHaveBeenCalledExactlyOnceWith(1)
    expect(result.current.isActive()).toBe(false)
  })

  it.each(['pointercancel', 'Escape', 'blur', 'lostpointercapture', 'unmount'] as const)(
    'discards a pending preview and ends once on %s',
    cancellation => {
      const { pointer, options, session, handle, unmount } = setupSession()
      pointer('pointermove', 20, 30)
      act(() => {
        if (cancellation === 'unmount') unmount()
        else if (cancellation === 'Escape') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        else if (cancellation === 'blur') window.dispatchEvent(new Event('blur'))
        else if (cancellation === 'lostpointercapture') handle.dispatchEvent(new PointerEvent(cancellation, { pointerId: 1 }))
        else window.dispatchEvent(new PointerEvent(cancellation, { pointerId: 1 }))
      })
      pointer('pointerup', 40, 50)
      act(() => vi.advanceTimersToNextFrame())

      expect(options.move).not.toHaveBeenCalled()
      expect(options.commit).not.toHaveBeenCalled()
      expect(options.cancel).toHaveBeenCalledExactlyOnceWith(session)
      expect(options.onEnd).toHaveBeenCalledOnce()
    },
  )

  it('ignores other pointer IDs and does not replay a previous gesture in the next one', () => {
    const { pointer, options, session, start } = setupSession()
    pointer('pointermove', 20, 30)
    pointer('pointerup', 40, 50)
    start(2)
    pointer('pointermove', 60, 70, 1)
    pointer('pointermove', 80, 90, 2)
    act(() => vi.advanceTimersToNextFrame())

    expect(options.move).toHaveBeenCalledExactlyOnceWith(session, { x: 80, y: 90 })
    expect(options.commit).toHaveBeenCalledOnce()
    expect(options.cancel).not.toHaveBeenCalled()
  })
})
