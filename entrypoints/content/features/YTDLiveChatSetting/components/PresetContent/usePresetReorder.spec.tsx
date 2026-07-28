import { fireEvent, render } from '@testing-library/react'
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
    <>
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
    </>
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
})
