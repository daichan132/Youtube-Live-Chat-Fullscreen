import { act, fireEvent, render } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useOverlayTooltipDismiss } from './useOverlayTooltipDismiss'

const Harness = ({ visible, dismiss }: { visible: boolean; dismiss: () => void }) => {
  const rail = useRef<HTMLDivElement>(null)
  useOverlayTooltipDismiss(visible, rail, dismiss)
  return (
    <div data-ylc-resizable>
      <iframe title='Native chat' data-ylc-chat />
      <div ref={rail}>
        <button type='button' onKeyDown={event => event.preventDefault()}>
          Native composite
        </button>
      </div>
    </div>
  )
}

describe('overlay tooltip Escape ownership', () => {
  it('handles only an unconsumed Escape while help is visible and releases on hide or unmount', () => {
    const dismiss = vi.fn()
    const view = render(<Harness visible dismiss={dismiss} />)
    expect(fireEvent.keyDown(document, { key: 'Escape', isComposing: true })).toBe(true)
    expect(fireEvent.keyDown(document, { key: 'ArrowRight' })).toBe(true)
    fireEvent.keyDown(view.getByRole('button', { name: 'Native composite' }), { key: 'Escape' })
    expect(dismiss).not.toHaveBeenCalled()

    expect(fireEvent.keyDown(document, { key: 'Escape' })).toBe(false)
    expect(dismiss).toHaveBeenCalledOnce()
    view.rerender(<Harness visible={false} dismiss={dismiss} />)
    expect(fireEvent.keyDown(document, { key: 'Escape' })).toBe(true)
    expect(dismiss).toHaveBeenCalledOnce()
    view.rerender(<Harness visible dismiss={dismiss} />)
    view.unmount()
    expect(fireEvent.keyDown(document, { key: 'Escape' })).toBe(true)
    expect(dismiss).toHaveBeenCalledOnce()
  })

  it('follows iframe replacement and releases the old chat document without reading its content', async () => {
    const dismiss = vi.fn()
    const view = render(<Harness visible dismiss={dismiss} />)
    const original = view.getByTitle('Native chat') as HTMLIFrameElement
    const originalDocument = original.contentDocument
    if (!originalDocument) throw new Error('The initial chat document must exist.')
    expect(fireEvent.keyDown(originalDocument.body, { key: 'Escape' })).toBe(false)
    expect(dismiss).toHaveBeenCalledOnce()

    const replacement = document.createElement('iframe')
    replacement.setAttribute('data-ylc-chat', '')
    await act(async () => original.replaceWith(replacement))
    const replacementDocument = replacement.contentDocument
    if (!replacementDocument) throw new Error('The replacement chat document must exist.')
    expect(fireEvent.keyDown(originalDocument.body, { key: 'Escape' })).toBe(true)
    expect(dismiss).toHaveBeenCalledOnce()
    expect(fireEvent.keyDown(replacementDocument.body, { key: 'Escape', isComposing: true })).toBe(true)
    expect(dismiss).toHaveBeenCalledOnce()
    expect(fireEvent.keyDown(replacementDocument.body, { key: 'Escape' })).toBe(false)
    expect(dismiss).toHaveBeenCalledTimes(2)

    view.unmount()
    expect(fireEvent.keyDown(replacementDocument.body, { key: 'Escape' })).toBe(true)
    expect(dismiss).toHaveBeenCalledTimes(2)
  })
})
