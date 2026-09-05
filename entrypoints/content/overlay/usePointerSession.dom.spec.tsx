import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePointerSession } from './usePointerSession'

const Harness = ({
  commit,
  cancel,
}: {
  commit: (session: string, point: { x: number; y: number }) => void
  cancel: (session: string) => void
}) => {
  const pointer = usePointerSession({
    begin: () => 'session',
    move: () => {},
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

  it.each(['lostpointercapture', 'blur'] as const)('cancels exactly once on %s', eventType => {
    const commit = vi.fn()
    const cancel = vi.fn()
    const view = render(<Harness commit={commit} cancel={cancel} />)
    const button = view.getByRole('button', { name: 'drag' })
    const capture = installPointerCapture(button)

    fireEvent.pointerDown(button, { button: 0, pointerId: 8 })
    if (eventType === 'lostpointercapture') {
      capture.hasPointerCapture.mockReturnValue(false)
      fireEvent(button, new PointerEvent('lostpointercapture', { pointerId: 8 }))
    } else {
      fireEvent(window, new Event('blur'))
    }
    fireEvent.pointerCancel(window, { pointerId: 8 })
    fireEvent(window, new Event('blur'))

    expect(commit).not.toHaveBeenCalled()
    expect(cancel).toHaveBeenCalledOnce()
    if (eventType === 'lostpointercapture') {
      expect(capture.releasePointerCapture).not.toHaveBeenCalled()
    } else {
      expect(capture.releasePointerCapture).toHaveBeenCalledWith(8)
    }
  })
})
