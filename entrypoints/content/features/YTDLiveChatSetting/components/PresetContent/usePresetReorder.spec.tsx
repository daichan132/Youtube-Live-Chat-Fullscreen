import { act, fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePresetReorder } from './usePresetReorder'

const INITIAL_IDS = ['first', 'middle', 'last']

const ReorderHarness = ({
  ids = INITIAL_IDS,
  onCommit,
  unknownHandle = false,
}: {
  ids?: string[]
  onCommit: (ids: string[]) => void
  unknownHandle?: boolean
}) => {
  const reorder = usePresetReorder({ ids, onCommit })

  return (
    <div data-ylc-setting-scroll-container data-testid='scroll-container'>
      <output data-testid='order'>{reorder.previewIds.join(',')}</output>
      <output data-testid='active'>{reorder.activeId ?? ''}</output>
      {reorder.previewIds.map(id => (
        <div key={id} data-ylc-preset-item={id}>
          <button type='button' aria-label={`reorder ${id}`} {...reorder.getHandleProps(id)}>
            Reorder
          </button>
          <input aria-label={`name ${id}`} defaultValue={id} />
        </div>
      ))}
      {unknownHandle && (
        <button type='button' aria-label='reorder unknown' {...reorder.getHandleProps('unknown')}>
          Unknown
        </button>
      )}
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

const arrangePresetRows = (container: HTMLElement) => {
  container.querySelectorAll<HTMLElement>('[data-ylc-preset-item]').forEach((item, index) => {
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(rectAt(index * 40))
  })
}

const arrangeScrollablePresetRows = (container: HTMLElement) => {
  const scrollContainer = container.querySelector<HTMLElement>('[data-ylc-setting-scroll-container]')
  if (!scrollContainer) throw new Error('Expected the preset scroll container')
  Object.defineProperties(scrollContainer, {
    clientHeight: { configurable: true, value: 380 },
    scrollHeight: { configurable: true, value: 800 },
  })
  vi.spyOn(scrollContainer, 'getBoundingClientRect').mockReturnValue({
    ...rectAt(0),
    bottom: 380,
    height: 380,
  })
  container.querySelectorAll<HTMLElement>('[data-ylc-preset-item]').forEach(item => {
    vi.spyOn(item, 'getBoundingClientRect').mockImplementation(() => {
      const items = [...scrollContainer.querySelectorAll<HTMLElement>('[data-ylc-preset-item]')]
      return rectAt(items.indexOf(item) * 40 - scrollContainer.scrollTop)
    })
  })
  return scrollContainer
}

const installAnimationFrameHarness = () => {
  let nextId = 0
  const callbacks = new Map<number, FrameRequestCallback>()
  const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    nextId += 1
    callbacks.set(nextId, callback)
    return nextId
  })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => {
    callbacks.delete(id)
  })
  const runNext = () => {
    const next = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined
    if (!next) return false
    callbacks.delete(next[0])
    act(() => next[1](performance.now()))
    return true
  }
  return { callbacks, cancel, request, runNext }
}

const order = (getByTestId: (id: string) => HTMLElement) => getByTestId('order').textContent

const drag = ({
  getByRole,
  clientY,
  pointerEnd = 'pointerup',
}: {
  getByRole: (role: string, options: { name: string }) => HTMLElement
  clientY: number
  pointerEnd?: 'pointerup' | 'pointercancel'
}) => {
  fireEvent.pointerDown(getByRole('button', { name: 'reorder first' }), { button: 0, pointerId: 1 })
  fireEvent.pointerMove(window, { pointerId: 1, clientY })
  fireEvent(window, new PointerEvent(pointerEnd, { pointerId: 1 }))
}

describe('usePresetReorder', () => {
  it.each([
    { label: 'the next position', clientY: 50, expected: ['middle', 'first', 'last'] },
    { label: 'the last position', clientY: 200, expected: ['middle', 'last', 'first'] },
  ])('commits a pointer reorder from the first item to $label', ({ clientY, expected }) => {
    const onCommit = vi.fn()
    const view = render(<ReorderHarness onCommit={onCommit} />)
    arrangePresetRows(view.container)

    drag({ ...view, clientY })

    expect(onCommit).toHaveBeenCalledOnce()
    expect(onCommit).toHaveBeenCalledWith(expected)
    expect(order(view.getByTestId)).toBe(expected.join(','))
  })

  it('commits a pointer reorder from the last item to the first position', () => {
    const onCommit = vi.fn()
    const view = render(<ReorderHarness onCommit={onCommit} />)
    arrangePresetRows(view.container)

    fireEvent.pointerDown(view.getByRole('button', { name: 'reorder last' }), { button: 0, pointerId: 2 })
    fireEvent.pointerMove(window, { pointerId: 2, clientY: 0 })
    fireEvent.pointerUp(window, { pointerId: 2 })

    expect(onCommit).toHaveBeenCalledWith(['last', 'first', 'middle'])
    expect(order(view.getByTestId)).toBe('last,first,middle')
  })

  it('does not commit when the pointer order is unchanged or the id is unknown', () => {
    const onCommit = vi.fn()
    const view = render(<ReorderHarness onCommit={onCommit} unknownHandle />)
    arrangePresetRows(view.container)

    fireEvent.pointerDown(view.getByRole('button', { name: 'reorder middle' }), { button: 0, pointerId: 3 })
    fireEvent.pointerUp(window, { pointerId: 3 })
    fireEvent.pointerDown(view.getByRole('button', { name: 'reorder unknown' }), { button: 0, pointerId: 4 })
    fireEvent.pointerMove(window, { pointerId: 4, clientY: 0 })
    fireEvent.pointerUp(window, { pointerId: 4 })

    expect(onCommit).not.toHaveBeenCalled()
    expect(view.getByTestId('active')).toHaveTextContent('')
    expect(order(view.getByTestId)).toBe(INITIAL_IDS.join(','))
  })

  it('restores the original order when a pointer reorder is cancelled', () => {
    const onCommit = vi.fn()
    const view = render(<ReorderHarness onCommit={onCommit} />)
    arrangePresetRows(view.container)

    drag({ ...view, clientY: 200, pointerEnd: 'pointercancel' })

    expect(onCommit).not.toHaveBeenCalled()
    expect(order(view.getByTestId)).toBe(INITIAL_IDS.join(','))
    expect(view.getByTestId('active')).toHaveTextContent('')
  })

  it('moves items one step with ArrowDown and ArrowUp while preserving focus', () => {
    const onCommit = vi.fn()
    const view = render(<ReorderHarness onCommit={onCommit} />)
    const firstHandle = view.getByRole('button', { name: 'reorder first' })
    firstHandle.focus()

    fireEvent.keyDown(firstHandle, { key: 'ArrowDown' })
    const movedHandle = view.getByRole('button', { name: 'reorder first' })
    fireEvent.keyDown(movedHandle, { key: 'ArrowUp' })

    expect(onCommit).toHaveBeenNthCalledWith(1, ['middle', 'first', 'last'])
    expect(onCommit).toHaveBeenNthCalledWith(2, INITIAL_IDS)
    expect(movedHandle).toHaveFocus()
    expect(order(view.getByTestId)).toBe(INITIAL_IDS.join(','))
  })

  it('does not move beyond either keyboard boundary', () => {
    const onCommit = vi.fn()
    const view = render(<ReorderHarness onCommit={onCommit} />)

    fireEvent.keyDown(view.getByRole('button', { name: 'reorder first' }), { key: 'ArrowUp' })
    fireEvent.keyDown(view.getByRole('button', { name: 'reorder last' }), { key: 'ArrowDown' })

    expect(onCommit).not.toHaveBeenCalled()
    expect(order(view.getByTestId)).toBe(INITIAL_IDS.join(','))
  })

  it('supports keyboard lift, preview, commit, and cancellation', () => {
    const onCommit = vi.fn()
    const view = render(<ReorderHarness onCommit={onCommit} />)
    const firstHandle = view.getByRole('button', { name: 'reorder first' })

    fireEvent.keyDown(firstHandle, { key: 'Enter' })
    fireEvent.keyDown(firstHandle, { key: 'ArrowDown' })
    expect(order(view.getByTestId)).toBe('middle,first,last')
    expect(onCommit).not.toHaveBeenCalled()

    fireEvent.keyDown(firstHandle, { key: 'Escape' })
    expect(order(view.getByTestId)).toBe(INITIAL_IDS.join(','))

    fireEvent.keyDown(firstHandle, { key: ' ' })
    fireEvent.keyDown(firstHandle, { key: 'ArrowDown' })
    fireEvent.keyDown(firstHandle, { key: ' ' })
    expect(onCommit).toHaveBeenCalledWith(['middle', 'first', 'last'])
  })

  it('does not start reordering from an interactive child outside the handle', () => {
    const onCommit = vi.fn()
    const view = render(<ReorderHarness onCommit={onCommit} />)

    fireEvent.pointerDown(view.getByRole('textbox', { name: 'name first' }), { button: 0, pointerId: 5 })
    fireEvent.pointerMove(window, { pointerId: 5, clientY: 200 })
    fireEvent.pointerUp(window, { pointerId: 5 })

    expect(onCommit).not.toHaveBeenCalled()
    expect(view.getByTestId('active')).toHaveTextContent('')
    expect(order(view.getByTestId)).toBe(INITIAL_IDS.join(','))
  })

  it('removes active global listeners when the consumer unmounts', () => {
    const onCommit = vi.fn()
    const addListener = vi.spyOn(window, 'addEventListener')
    const removeListener = vi.spyOn(window, 'removeEventListener')
    const view = render(<ReorderHarness onCommit={onCommit} />)
    arrangePresetRows(view.container)

    fireEvent.pointerDown(view.getByRole('button', { name: 'reorder first' }), { button: 0, pointerId: 6 })
    const reorderListeners = addListener.mock.calls.filter(([type]) =>
      ['pointermove', 'pointerup', 'pointercancel', 'keydown'].includes(type),
    )

    view.unmount()

    expect(reorderListeners).toHaveLength(4)
    for (const [type, listener] of reorderListeners) {
      expect(removeListener).toHaveBeenCalledWith(type, listener)
    }
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('auto-scrolls at the container edge, remeasures rows, and commits only on pointer up', () => {
    const ids = Array.from({ length: 12 }, (_, index) => `preset-${index + 1}`)
    const onCommit = vi.fn()
    const animationFrames = installAnimationFrameHarness()
    const view = render(<ReorderHarness ids={ids} onCommit={onCommit} />)
    const scrollContainer = arrangeScrollablePresetRows(view.container)
    const rows = [...view.container.querySelectorAll<HTMLElement>('[data-ylc-preset-item]')]
    const firstRowRect = vi.mocked(rows[0].getBoundingClientRect)

    fireEvent.pointerDown(view.getByRole('button', { name: 'reorder preset-1' }), {
      button: 0,
      clientY: 379,
      pointerId: 7,
    })
    expect(onCommit).not.toHaveBeenCalled()
    expect(firstRowRect).toHaveBeenCalledTimes(1)

    expect(animationFrames.runNext()).toBe(true)
    expect(scrollContainer.scrollTop).toBeGreaterThan(0)
    expect(firstRowRect.mock.calls.length).toBeGreaterThan(1)
    expect(order(view.getByTestId)).not.toBe(ids.join(','))
    expect(onCommit).not.toHaveBeenCalled()

    animationFrames.runNext()
    animationFrames.runNext()
    fireEvent.pointerUp(window, { pointerId: 7 })

    expect(onCommit).toHaveBeenCalledOnce()
    expect(onCommit).toHaveBeenCalledWith(order(view.getByTestId)?.split(','))
    expect(animationFrames.cancel).toHaveBeenCalledOnce()
    expect(animationFrames.callbacks).toHaveLength(0)
  })

  it('auto-scrolls upward when the pointer stays at the top edge', () => {
    const ids = Array.from({ length: 12 }, (_, index) => `preset-${index + 1}`)
    const onCommit = vi.fn()
    const animationFrames = installAnimationFrameHarness()
    const view = render(<ReorderHarness ids={ids} onCommit={onCommit} />)
    const scrollContainer = arrangeScrollablePresetRows(view.container)
    scrollContainer.scrollTop = 200

    fireEvent.pointerDown(view.getByRole('button', { name: 'reorder preset-12' }), {
      button: 0,
      clientY: 1,
      pointerId: 9,
    })
    animationFrames.runNext()

    expect(scrollContainer.scrollTop).toBeLessThan(200)
    expect(onCommit).not.toHaveBeenCalled()

    fireEvent.pointerCancel(window, { pointerId: 9 })
    expect(order(view.getByTestId)).toBe(ids.join(','))
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('ignores move, up, and cancel events from a different pointer', () => {
    const onCommit = vi.fn()
    const animationFrames = installAnimationFrameHarness()
    const view = render(<ReorderHarness onCommit={onCommit} />)
    arrangePresetRows(view.container)

    fireEvent.pointerDown(view.getByRole('button', { name: 'reorder first' }), {
      button: 0,
      clientY: 0,
      pointerId: 10,
    })
    fireEvent.pointerMove(window, { clientY: 200, pointerId: 11 })
    fireEvent.pointerUp(window, { pointerId: 11 })
    fireEvent.pointerCancel(window, { pointerId: 11 })

    expect(order(view.getByTestId)).toBe(INITIAL_IDS.join(','))
    expect(view.getByTestId('active')).toHaveTextContent('first')
    expect(onCommit).not.toHaveBeenCalled()
    expect(animationFrames.cancel).not.toHaveBeenCalled()
    expect(animationFrames.callbacks).toHaveLength(1)

    fireEvent.pointerMove(window, { clientY: 200, pointerId: 10 })
    expect(order(view.getByTestId)).toBe('middle,last,first')
    fireEvent.pointerUp(window, { pointerId: 10 })

    expect(onCommit).toHaveBeenCalledOnce()
    expect(onCommit).toHaveBeenCalledWith(['middle', 'last', 'first'])
    expect(view.getByTestId('active')).toHaveTextContent('')
    expect(animationFrames.cancel).toHaveBeenCalledOnce()
    expect(animationFrames.callbacks).toHaveLength(0)
  })

  it.each(['pointercancel', 'unmount'] as const)('stops edge auto-scroll on %s without committing', endGesture => {
    const ids = Array.from({ length: 12 }, (_, index) => `preset-${index + 1}`)
    const onCommit = vi.fn()
    const animationFrames = installAnimationFrameHarness()
    const view = render(<ReorderHarness ids={ids} onCommit={onCommit} />)
    const scrollContainer = arrangeScrollablePresetRows(view.container)

    fireEvent.pointerDown(view.getByRole('button', { name: 'reorder preset-1' }), {
      button: 0,
      clientY: 379,
      pointerId: 8,
    })
    animationFrames.runNext()
    const stoppedAt = scrollContainer.scrollTop

    if (endGesture === 'unmount') view.unmount()
    else fireEvent.pointerCancel(window, { pointerId: 8 })

    expect(animationFrames.cancel).toHaveBeenCalledOnce()
    expect(animationFrames.callbacks).toHaveLength(0)
    expect(animationFrames.runNext()).toBe(false)
    expect(scrollContainer.scrollTop).toBe(stoppedAt)
    expect(onCommit).not.toHaveBeenCalled()
  })
})
