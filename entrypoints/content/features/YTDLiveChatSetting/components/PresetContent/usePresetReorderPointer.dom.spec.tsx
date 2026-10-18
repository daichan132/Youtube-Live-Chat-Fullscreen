import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePresetReorder } from './usePresetReorder'

const IDS = ['first', 'second', 'third']

const Harness = ({ onCommit }: { onCommit: (ids: string[]) => void }) => {
  const reorder = usePresetReorder({
    ids: IDS,
    onCommit,
    describeMove: (id, position) => `${id}:${position}`,
  })

  return (
    <div data-ylc-setting-scroll-container>
      <output data-testid='active'>{reorder.activeId ?? ''}</output>
      {reorder.previewIds.map(id => (
        <div key={id} data-ylc-preset-item={id}>
          <button type='button' aria-label={`reorder ${id}`} {...reorder.getHandleProps(id)}>
            Reorder
          </button>
        </div>
      ))}
    </div>
  )
}

const rectAt = (top: number): DOMRect => ({
  x: 0,
  y: top,
  top,
  right: 200,
  bottom: top + 40,
  left: 0,
  width: 200,
  height: 40,
  toJSON: () => ({}),
})

const installAnimationFrameQueue = () => {
  let id = 0
  const callbacks = new Map<number, FrameRequestCallback>()
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    id += 1
    callbacks.set(id, callback)
    return id
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(frameId => {
    callbacks.delete(frameId)
  })
  return callbacks
}

const installPointerCapture = (element: HTMLElement) => {
  const setPointerCapture = vi.fn()
  const hasPointerCapture = vi.fn(() => true)
  const releasePointerCapture = vi.fn()
  Object.assign(element, { setPointerCapture, hasPointerCapture, releasePointerCapture })
  return { setPointerCapture, hasPointerCapture, releasePointerCapture }
}

describe('usePresetReorder pointer lifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reuses measured row slots across pointer-move events', () => {
    installAnimationFrameQueue()
    const view = render(<Harness onCommit={() => {}} />)
    const rows = [...view.container.querySelectorAll<HTMLElement>('[data-ylc-preset-item]')]
    const reads = rows.map((row, index) => vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(rectAt(index * 40)))

    fireEvent.pointerDown(view.getByRole('button', { name: 'reorder first' }), {
      button: 0,
      clientY: 0,
      pointerId: 1,
    })
    fireEvent.pointerMove(window, { clientY: 50, pointerId: 1 })
    fireEvent.pointerMove(window, { clientY: 90, pointerId: 1 })

    for (const read of reads) expect(read).toHaveBeenCalledOnce()
    fireEvent.pointerCancel(window, { pointerId: 1 })
  })

  it.each(['blur', 'lostpointercapture'] as const)('cancels once and cleans up capture on %s', eventType => {
    installAnimationFrameQueue()
    const onCommit = vi.fn()
    const view = render(<Harness onCommit={onCommit} />)
    view.container.querySelectorAll<HTMLElement>('[data-ylc-preset-item]').forEach((row, index) => {
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(rectAt(index * 40))
    })
    const handle = view.getByRole('button', { name: 'reorder first' })
    const captureTarget = view.container.querySelector<HTMLElement>('[data-ylc-setting-scroll-container]')
    if (!captureTarget) throw new Error('Missing settings scroll container')
    const capture = installPointerCapture(captureTarget)

    fireEvent.pointerDown(handle, { button: 0, pointerId: 2 })
    expect(capture.setPointerCapture).toHaveBeenCalledWith(2)
    if (eventType === 'lostpointercapture') {
      capture.hasPointerCapture.mockReturnValue(false)
      fireEvent(captureTarget, new PointerEvent('lostpointercapture', { pointerId: 2 }))
    } else {
      fireEvent(window, new Event('blur'))
    }
    fireEvent.pointerCancel(window, { pointerId: 2 })
    fireEvent(window, new Event('blur'))

    expect(view.getByTestId('active')).toHaveTextContent('')
    expect(onCommit).not.toHaveBeenCalled()
    if (eventType === 'lostpointercapture') {
      expect(capture.releasePointerCapture).not.toHaveBeenCalled()
    } else {
      expect(capture.releasePointerCapture).toHaveBeenCalledWith(2)
    }
  })

  it('keeps container capture through a bubbled handle-capture loss and releases once after committing', () => {
    installAnimationFrameQueue()
    const onCommit = vi.fn()
    const view = render(<Harness onCommit={onCommit} />)
    const container = view.container.querySelector<HTMLElement>('[data-ylc-setting-scroll-container]')
    if (!container) throw new Error('Missing settings scroll container')
    const capture = installPointerCapture(container)
    view.container.querySelectorAll<HTMLElement>('[data-ylc-preset-item]').forEach((row, index) => {
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(rectAt(index * 40))
    })
    const handle = view.getByRole('button', { name: 'reorder first' })
    const handleCapture = installPointerCapture(handle)
    fireEvent.pointerDown(handle, { button: 0, pointerId: 3, clientY: 0 })
    // Touch may first implicitly capture on the handle before its explicit
    // container owner takes over. That loss bubbles but does not end the drag.
    fireEvent(handle, new PointerEvent('lostpointercapture', { pointerId: 3, bubbles: true }))
    expect(view.getByTestId('active')).toHaveTextContent('first')
    expect(capture.releasePointerCapture).not.toHaveBeenCalled()
    fireEvent.pointerMove(window, { pointerId: 3, clientY: 90 })

    expect(capture.setPointerCapture).toHaveBeenCalledWith(3)
    expect(handleCapture.setPointerCapture).not.toHaveBeenCalled()
    expect(onCommit).not.toHaveBeenCalled()
    fireEvent.pointerUp(window, { pointerId: 3, clientY: 90 })
    fireEvent.pointerCancel(window, { pointerId: 3 })
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(['second', 'third', 'first'])
    expect(capture.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(3)
  })

  it('ignores an already queued auto-scroll callback after another gesture starts', () => {
    const frames = installAnimationFrameQueue()
    const onCommit = vi.fn()
    const view = render(<Harness onCommit={onCommit} />)
    const container = view.container.querySelector<HTMLElement>('[data-ylc-setting-scroll-container]')
    if (!container) throw new Error('Missing settings scroll container')
    Object.defineProperties(container, {
      clientHeight: { configurable: true, value: 380 },
      scrollHeight: { configurable: true, value: 800 },
    })
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 380))
    view.container.querySelectorAll<HTMLElement>('[data-ylc-preset-item]').forEach((row, index) => {
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(rectAt(index * 40))
    })

    fireEvent.pointerDown(view.getByRole('button', { name: 'reorder first' }), {
      button: 0,
      pointerId: 1,
      clientY: 379,
    })
    fireEvent.pointerMove(window, { pointerId: 1, clientY: 390 })
    const staleFrame = frames.values().next().value
    if (!staleFrame) throw new Error('Missing queued auto-scroll callback')
    fireEvent.pointerCancel(window, { pointerId: 1 })
    fireEvent.pointerDown(view.getByRole('button', { name: 'reorder second' }), {
      button: 0,
      pointerId: 2,
      clientY: 379,
    })
    act(() => staleFrame(performance.now()))

    expect(container.scrollTop).toBe(0)
    expect(frames).toHaveLength(0)
    expect(view.getByTestId('active')).toHaveTextContent('second')
    fireEvent.pointerUp(window, { pointerId: 2, clientY: 379 })
    expect(onCommit).not.toHaveBeenCalled()
    expect(frames).toHaveLength(0)
  })
})
