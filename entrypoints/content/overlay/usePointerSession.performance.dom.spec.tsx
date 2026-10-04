import { act, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { type Point, usePointerSession } from './usePointerSession'

const mockAnimationFrames = () => {
  let nextId = 0
  const pending = new Map<number, FrameRequestCallback>()
  const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    const id = ++nextId
    pending.set(id, callback)
    return id
  })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => {
    pending.delete(id)
  })
  const flush = () => {
    const callbacks = [...pending.values()]
    pending.clear()
    act(() => {
      for (const callback of callbacks) callback(0)
    })
  }
  const getFirstCallback = () => {
    const callback = request.mock.calls[0]?.[0]
    if (!callback) throw new Error('No animation frame was scheduled')
    return callback
  }
  return { request, cancel, pending, flush, getFirstCallback }
}

const Harness = ({
  move,
  commit,
  cancel,
  onRender = () => {},
}: {
  move: (session: string, point: Point) => void
  commit: (session: string, point: Point) => void
  cancel: (session: string) => void
  onRender?: () => void
}) => {
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 })
  const pointer = usePointerSession({
    begin: () => 'session',
    move: (session, next) => {
      move(session, next)
      setPoint(next)
    },
    commit,
    cancel,
  })
  onRender()
  return (
    <button type='button' onPointerDown={pointer.onPointerDown}>
      {point.x}:{point.y}
    </button>
  )
}

describe('usePointerSession frame-coalesced previews', () => {
  it('renders only the latest position once per frame for a burst of pointer input', () => {
    const frames = mockAnimationFrames()
    const move = vi.fn()
    const onRender = vi.fn()
    const view = render(<Harness move={move} commit={vi.fn()} cancel={vi.fn()} onRender={onRender} />)
    const handle = view.getByRole('button')
    fireEvent.pointerDown(handle, { button: 0, pointerId: 7 })
    const initialRenderCount = onRender.mock.calls.length

    for (let position = 1; position <= 100; position++) {
      fireEvent.pointerMove(window, { pointerId: 7, clientX: position, clientY: position * 2 })
    }

    expect(frames.request).toHaveBeenCalledOnce()
    expect(move).not.toHaveBeenCalled()
    expect(onRender).toHaveBeenCalledTimes(initialRenderCount)
    frames.flush()
    expect(move).toHaveBeenCalledExactlyOnceWith('session', { x: 100, y: 200 })
    expect(handle).toHaveTextContent('100:200')
    expect(onRender).toHaveBeenCalledTimes(initialRenderCount + 1)

    fireEvent.pointerMove(window, { pointerId: 7, clientX: 101, clientY: 202 })
    frames.flush()
    expect(move).toHaveBeenCalledTimes(2)
    expect(handle).toHaveTextContent('101:202')
    expect(onRender).toHaveBeenCalledTimes(initialRenderCount + 2)
  })

  it('commits the final pointer-up coordinates synchronously and discards an unpainted preview', () => {
    const frames = mockAnimationFrames()
    const move = vi.fn()
    const commit = vi.fn()
    const view = render(<Harness move={move} commit={commit} cancel={vi.fn()} />)
    const handle = view.getByRole('button')
    fireEvent.pointerDown(handle, { button: 0, pointerId: 7 })
    fireEvent.pointerMove(window, { pointerId: 7, clientX: 20, clientY: 30 })
    const pendingCallback = frames.getFirstCallback()

    fireEvent.pointerUp(window, { pointerId: 7, clientX: 40, clientY: 50 })

    expect(commit).toHaveBeenCalledExactlyOnceWith('session', { x: 40, y: 50 })
    expect(move).not.toHaveBeenCalled()
    expect(frames.cancel).toHaveBeenCalledWith(1)
    expect(frames.pending.size).toBe(0)
    // Even a callback already delivered by the browser cannot update a later gesture.
    fireEvent.pointerDown(handle, { button: 0, pointerId: 8 })
    fireEvent.pointerMove(window, { pointerId: 8, clientX: 60, clientY: 70 })
    act(() => pendingCallback(0))
    expect(move).not.toHaveBeenCalled()
    frames.flush()
    expect(move).toHaveBeenCalledExactlyOnceWith('session', { x: 60, y: 70 })
  })

  it.each(['Escape', 'pointercancel', 'blur', 'lostpointercapture', 'unmount'] as const)(
    'discards queued movement when a gesture ends through %s',
    reason => {
      const frames = mockAnimationFrames()
      const move = vi.fn()
      const commit = vi.fn()
      const cancel = vi.fn()
      const view = render(<Harness move={move} commit={commit} cancel={cancel} />)
      const handle = view.getByRole('button')
      fireEvent.pointerDown(handle, { button: 0, pointerId: 7 })
      fireEvent.pointerMove(window, { pointerId: 7, clientX: 20, clientY: 30 })
      const pendingCallback = frames.getFirstCallback()

      if (reason === 'Escape') fireEvent.keyDown(window, { key: 'Escape' })
      else if (reason === 'pointercancel') fireEvent.pointerCancel(window, { pointerId: 7 })
      else if (reason === 'blur') fireEvent(window, new Event('blur'))
      else if (reason === 'lostpointercapture') fireEvent(handle, new PointerEvent(reason, { pointerId: 7 }))
      else view.unmount()

      expect(cancel).toHaveBeenCalledExactlyOnceWith('session')
      expect(commit).not.toHaveBeenCalled()
      expect(frames.cancel).toHaveBeenCalledWith(1)
      expect(frames.pending.size).toBe(0)
      act(() => pendingCallback(0))
      fireEvent.pointerUp(window, { pointerId: 7, clientX: 40, clientY: 50 })
      expect(move).not.toHaveBeenCalled()
      expect(commit).not.toHaveBeenCalled()
    },
  )

  it('ignores unrelated pointers and uses the latest callback when the scheduled frame runs', () => {
    const frames = mockAnimationFrames()
    const originalMove = vi.fn()
    const currentMove = vi.fn()
    const commit = vi.fn()
    const cancel = vi.fn()
    const view = render(<Harness move={originalMove} commit={commit} cancel={cancel} />)
    fireEvent.pointerDown(view.getByRole('button'), { button: 0, pointerId: 7 })
    fireEvent.pointerMove(window, { pointerId: 8, clientX: 10, clientY: 20 })
    expect(frames.request).not.toHaveBeenCalled()
    fireEvent.pointerMove(window, { pointerId: 7, clientX: 30, clientY: 40 })
    fireEvent.pointerMove(window, { pointerId: 8, clientX: 50, clientY: 60 })
    fireEvent.pointerCancel(window, { pointerId: 8 })
    fireEvent.pointerUp(window, { pointerId: 8 })
    view.rerender(<Harness move={currentMove} commit={commit} cancel={cancel} />)
    frames.flush()

    expect(originalMove).not.toHaveBeenCalled()
    expect(currentMove).toHaveBeenCalledExactlyOnceWith('session', { x: 30, y: 40 })
    expect(cancel).not.toHaveBeenCalled()
    expect(commit).not.toHaveBeenCalled()
    fireEvent.pointerUp(window, { pointerId: 7, clientX: 70, clientY: 80 })
    expect(commit).toHaveBeenCalledExactlyOnceWith('session', { x: 70, y: 80 })
  })
})
