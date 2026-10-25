import { act, fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { type Point, usePointerSession } from './usePointerSession'

const Harness = ({
  commit,
  cancel,
  move = () => {},
}: {
  commit: (session: string, point: { x: number; y: number }) => void
  cancel: (session: string) => void
  move?: (session: string, point: Point) => void
}) => {
  const pointer = usePointerSession({
    begin: () => 'session',
    move,
    commit,
    cancel,
  })
  return (
    <button type='button' onPointerDown={pointer.onPointerDown}>
      drag
    </button>
  )
}

const installPointerCapture = (element: HTMLElement) => {
  const setPointerCapture = vi.fn()
  const hasPointerCapture = vi.fn(() => true)
  const releasePointerCapture = vi.fn()
  Object.assign(element, {
    setPointerCapture,
    hasPointerCapture,
    releasePointerCapture,
  })
  return { setPointerCapture, hasPointerCapture, releasePointerCapture }
}

describe('usePointerSession pointer capture lifecycle', () => {
  it('commits once when a host ancestor stops pointerup propagation before capture is lost', () => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const view = render(<Harness commit={commit} cancel={cancel} />)
    const button = view.getByRole('button', { name: 'drag' })
    const capture = installPointerCapture(button)
    const stopPointerUp = vi.fn((event: Event) => event.stopPropagation())
    view.container.addEventListener('pointerup', stopPointerUp)

    fireEvent.pointerDown(button, { button: 0, clientX: 10, clientY: 20, pointerId: 9 })
    fireEvent.pointerMove(button, { clientX: 30, clientY: 40, pointerId: 9 })
    fireEvent.pointerUp(button, { clientX: 45, clientY: 55, pointerId: 9 })
    fireEvent(button, new PointerEvent('lostpointercapture', { pointerId: 9 }))
    fireEvent.pointerUp(window, { clientX: 45, clientY: 55, pointerId: 9 })

    expect(stopPointerUp).toHaveBeenCalledOnce()
    expect(commit).toHaveBeenCalledExactlyOnceWith('session', { x: 45, y: 55 })
    expect(cancel).not.toHaveBeenCalled()
    expect(capture.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(9)
  })

  it('previews the latest movement even when a host ancestor stops pointermove propagation', async () => {
    const move = vi.fn()
    const view = render(<Harness commit={vi.fn()} cancel={vi.fn()} move={move} />)
    const button = view.getByRole('button', { name: 'drag' })
    installPointerCapture(button)
    const stopPointerMove = vi.fn((event: Event) => event.stopPropagation())
    view.container.addEventListener('pointermove', stopPointerMove)

    fireEvent.pointerDown(button, { button: 0, pointerId: 10 })
    fireEvent.pointerMove(button, { clientX: 30, clientY: 40, pointerId: 10 })
    fireEvent.pointerMove(button, { clientX: 45, clientY: 55, pointerId: 10 })
    await act(async () => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))

    expect(stopPointerMove).toHaveBeenCalledTimes(2)
    expect(move).toHaveBeenCalledExactlyOnceWith('session', { x: 45, y: 55 })
    fireEvent.pointerUp(button, { clientX: 45, clientY: 55, pointerId: 10 })
  })

  it('cancels once when a host ancestor stops pointercancel propagation', () => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const view = render(<Harness commit={commit} cancel={cancel} />)
    const button = view.getByRole('button', { name: 'drag' })
    const capture = installPointerCapture(button)
    const stopPointerCancel = vi.fn((event: Event) => event.stopPropagation())
    view.container.addEventListener('pointercancel', stopPointerCancel)

    fireEvent.pointerDown(button, { button: 0, pointerId: 11 })
    fireEvent.pointerCancel(button, { pointerId: 11 })
    expect(cancel).toHaveBeenCalledExactlyOnceWith('session')
    fireEvent(button, new PointerEvent('lostpointercapture', { pointerId: 11 }))
    fireEvent.pointerUp(window, { clientX: 45, clientY: 55, pointerId: 11 })

    expect(stopPointerCancel).toHaveBeenCalledOnce()
    expect(cancel).toHaveBeenCalledExactlyOnceWith('session')
    expect(commit).not.toHaveBeenCalled()
    expect(capture.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(11)
  })

  it('releases capture when the gesture commits', () => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const view = render(<Harness commit={commit} cancel={cancel} />)
    const button = view.getByRole('button', { name: 'drag' })
    const capture = installPointerCapture(button)

    fireEvent.pointerDown(button, { button: 0, clientX: 10, clientY: 20, pointerId: 7 })
    fireEvent.pointerUp(window, { clientX: 30, clientY: 40, pointerId: 7 })

    expect(capture.setPointerCapture).toHaveBeenCalledWith(7)
    expect(capture.releasePointerCapture).toHaveBeenCalledWith(7)
    expect(commit).toHaveBeenCalledWith('session', { x: 30, y: 40 })
    expect(cancel).not.toHaveBeenCalled()
  })

  it('continues preview and commits the release point after capture routing is lost', async () => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const move = vi.fn()
    const view = render(<Harness commit={commit} cancel={cancel} move={move} />)
    const button = view.getByRole('button', { name: 'drag' })
    const capture = installPointerCapture(button)
    fireEvent.pointerDown(button, { button: 0, clientX: 10, clientY: 20, pointerId: 12 })
    fireEvent.pointerMove(window, { clientX: 30, clientY: 40, pointerId: 12 })
    capture.hasPointerCapture.mockReturnValue(false)
    fireEvent(button, new PointerEvent('lostpointercapture', { pointerId: 12 }))
    fireEvent.pointerMove(window, { clientX: 50, clientY: 60, pointerId: 12 })
    await act(async () => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))
    expect(move).toHaveBeenCalledExactlyOnceWith('session', { x: 50, y: 60 })
    expect(cancel).not.toHaveBeenCalled()
    fireEvent.pointerUp(window, { clientX: 65, clientY: 75, pointerId: 12 })
    fireEvent.pointerUp(window, { clientX: 65, clientY: 75, pointerId: 12 })
    expect(commit).toHaveBeenCalledExactlyOnceWith('session', { x: 65, y: 75 })
    expect(capture.releasePointerCapture).not.toHaveBeenCalled()
  })

  it.each(['pointercancel', 'blur', 'Escape'] as const)('cancels exactly once after capture loss followed by %s', eventType => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const view = render(<Harness commit={commit} cancel={cancel} />)
    const button = view.getByRole('button', { name: 'drag' })
    const capture = installPointerCapture(button)

    fireEvent.pointerDown(button, { button: 0, pointerId: 8 })
    capture.hasPointerCapture.mockReturnValue(false)
    fireEvent(button, new PointerEvent('lostpointercapture', { pointerId: 8 }))
    expect(cancel).not.toHaveBeenCalled()
    if (eventType === 'pointercancel') fireEvent.pointerCancel(window, { pointerId: 8 })
    else if (eventType === 'Escape') fireEvent.keyDown(window, { key: 'Escape' })
    else fireEvent(window, new Event('blur'))
    fireEvent.pointerCancel(window, { pointerId: 8 })
    fireEvent(window, new Event('blur'))

    expect(commit).not.toHaveBeenCalled()
    expect(cancel).toHaveBeenCalledOnce()
    expect(capture.releasePointerCapture).not.toHaveBeenCalled()
  })
})
