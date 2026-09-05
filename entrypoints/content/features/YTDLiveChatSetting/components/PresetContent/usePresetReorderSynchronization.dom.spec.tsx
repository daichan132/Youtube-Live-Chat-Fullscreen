import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Modal } from '@/shared/components/Modal'
import { usePresetReorder } from './usePresetReorder'

const IDS = ['first', 'second', 'third']

const Harness = ({
  ids = IDS,
  onCommit,
  onClose,
}: {
  ids?: string[]
  onCommit: (ids: string[]) => void
  onClose?: () => void
}) => {
  const reorder = usePresetReorder({ ids, onCommit, describeMove: (id, position) => `${id}:${position}` })
  return (
    <Modal isOpen ariaLabel='Presets' shouldFocusAfterRender={false} onRequestClose={onClose}>
      <div data-ylc-setting-scroll-container data-testid='scroll'>
        <output data-testid='active'>{reorder.activeId ?? ''}</output>
        <output data-testid='order'>{reorder.previewIds.join(',')}</output>
        {reorder.previewIds.map(id => (
          <div key={id} data-ylc-preset-item={id}>
            <button type='button' aria-label={`reorder ${id}`} {...reorder.getHandleProps(id)}>
              Reorder
            </button>
          </div>
        ))}
      </div>
    </Modal>
  )
}

const measureRows = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('[data-ylc-preset-item]')].map(row =>
    vi.spyOn(row, 'getBoundingClientRect').mockImplementation(() => {
      const rows = [...container.querySelectorAll('[data-ylc-preset-item]')]
      return new DOMRect(0, rows.indexOf(row) * 40 - container.scrollTop, 200, 40)
    }),
  )

beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('preset reorder synchronization', () => {
  it('commits the final pointer-up position even without a preceding move', () => {
    const onCommit = vi.fn()
    const view = render(<Harness onCommit={onCommit} />)
    measureRows(view.getByTestId('scroll'))
    fireEvent.pointerDown(view.getByRole('button', { name: 'reorder first' }), { button: 0, pointerId: 1, clientY: 0 })
    fireEvent.pointerUp(window, { pointerId: 1, clientY: 90 })

    expect(onCommit).toHaveBeenCalledOnce()
    expect(onCommit).toHaveBeenCalledWith(['second', 'third', 'first'])
    expect(view.getByTestId('active')).toBeEmptyDOMElement()
  })

  it('does not reorder when the handle is only clicked at the row midpoint', () => {
    const onCommit = vi.fn()
    const view = render(<Harness onCommit={onCommit} />)
    measureRows(view.getByTestId('scroll'))
    fireEvent.pointerDown(view.getByRole('button', { name: 'reorder first' }), { button: 0, pointerId: 1, clientY: 20 })
    fireEvent.pointerMove(window, { pointerId: 1, clientY: 20 })
    fireEvent.pointerUp(window, { pointerId: 1, clientY: 20 })
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('cancels a stale gesture and adopts an externally replaced list', () => {
    const onCommit = vi.fn()
    const view = render(<Harness onCommit={onCommit} />)
    measureRows(view.getByTestId('scroll'))
    const handle = view.getByRole('button', { name: 'reorder first' })
    const releasePointerCapture = vi.fn()
    Object.assign(handle, { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture })
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 0 })
    fireEvent.pointerMove(window, { pointerId: 1, clientY: 90 })
    view.rerender(<Harness ids={['third', 'second']} onCommit={onCommit} />)
    fireEvent.pointerUp(window, { pointerId: 1, clientY: 90 })

    expect(view.getByTestId('active')).toBeEmptyDOMElement()
    expect(view.getByTestId('order')).toHaveTextContent('third,second')
    expect(releasePointerCapture).toHaveBeenCalledWith(1)
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('keeps a gesture when a rerender supplies the same IDs', () => {
    const onCommit = vi.fn()
    const view = render(<Harness onCommit={onCommit} />)
    const handle = view.getByRole('button', { name: 'reorder first' })
    fireEvent.keyDown(handle, { key: 'Enter' })
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    view.rerender(<Harness ids={[...IDS]} onCommit={onCommit} />)

    expect(view.getByTestId('active')).toHaveTextContent('first')
    expect(view.getByTestId('order')).toHaveTextContent('second,first,third')
    fireEvent.keyDown(handle, { key: 'Enter' })
    expect(onCommit).toHaveBeenCalledOnce()
    expect(onCommit).toHaveBeenCalledWith(['second', 'first', 'third'])
  })

  it('remeasures after manual scrolling but not duplicate scroll signals', () => {
    const view = render(<Harness onCommit={() => {}} />)
    const container = view.getByTestId('scroll')
    const reads = measureRows(container)
    fireEvent.pointerDown(view.getByRole('button', { name: 'reorder first' }), { button: 0, pointerId: 1, clientY: 0 })
    fireEvent.pointerMove(window, { pointerId: 1, clientY: 50 })
    container.scrollTop = 40
    fireEvent.scroll(container)
    fireEvent.scroll(container)

    expect(view.getByTestId('order')).toHaveTextContent('second,third,first')
    for (const read of reads) expect(read).toHaveBeenCalledTimes(2)
    fireEvent.pointerCancel(window, { pointerId: 1 })
    container.scrollTop = 80
    fireEvent.scroll(container)
    for (const read of reads) expect(read).toHaveBeenCalledTimes(2)
  })

  it.each(['pointer', 'keyboard'])('lets Escape cancel %s reordering before closing the modal', kind => {
    const onCommit = vi.fn()
    const onClose = vi.fn()
    const view = render(<Harness onCommit={onCommit} onClose={onClose} />)
    const handle = view.getByRole('button', { name: 'reorder first' })
    if (kind === 'pointer') fireEvent.pointerDown(handle, { button: 0, pointerId: 1 })
    else fireEvent.keyDown(handle, { key: 'Enter' })
    fireEvent.keyDown(handle, { key: 'Escape', isComposing: true })
    expect(view.getByTestId('active')).toHaveTextContent('first')
    fireEvent.keyDown(handle, { key: 'Escape' })

    expect(view.getByTestId('active')).toBeEmptyDOMElement()
    expect(onCommit).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(handle, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('cancels keyboard reordering on window blur', () => {
    const onCommit = vi.fn()
    const view = render(<Harness onCommit={onCommit} />)
    const handle = view.getByRole('button', { name: 'reorder first' })
    fireEvent.keyDown(handle, { key: 'Enter' })
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    fireEvent(window, new Event('blur'))

    expect(view.getByTestId('active')).toBeEmptyDOMElement()
    expect(view.getByTestId('order')).toHaveTextContent(IDS.join(','))
    expect(onCommit).not.toHaveBeenCalled()
  })
})
