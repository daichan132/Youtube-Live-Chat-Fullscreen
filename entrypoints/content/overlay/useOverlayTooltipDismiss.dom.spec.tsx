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

  it('releases an inaccessible document and follows the next iframe load', () => {
    const dismiss = vi.fn()
    const view = render(<Harness visible dismiss={dismiss} />)
    const frame = view.getByTitle('Native chat') as HTMLIFrameElement
    const originalDocument = frame.contentDocument
    if (!originalDocument) throw new Error('The initial chat document must exist.')
    const nextFrame = document.createElement('iframe')
    document.body.append(nextFrame)
    const nextDocument = nextFrame.contentDocument
    if (!nextDocument) throw new Error('The next chat document must exist.')
    let currentDocument: Document | null = originalDocument
    Object.defineProperty(frame, 'contentDocument', {
      configurable: true,
      get: () => {
        if (!currentDocument) throw new Error('Chat is temporarily inaccessible')
        return currentDocument
      },
    })

    currentDocument = null
    fireEvent.load(frame)
    expect(fireEvent.keyDown(originalDocument.body, { key: 'Escape' })).toBe(true)
    expect(dismiss).not.toHaveBeenCalled()

    currentDocument = nextDocument
    fireEvent.load(frame)
    expect(fireEvent.keyDown(nextDocument.body, { key: 'Escape' })).toBe(false)
    expect(dismiss).toHaveBeenCalledOnce()
    view.unmount()
    expect(fireEvent.keyDown(nextDocument.body, { key: 'Escape' })).toBe(true)
    expect(dismiss).toHaveBeenCalledOnce()
    nextFrame.remove()
  })

  it('follows the replacement document after the old one is revoked', () => {
    const dismiss = vi.fn()
    const view = render(<Harness visible dismiss={dismiss} />)
    const frame = view.getByTitle('Native chat') as HTMLIFrameElement
    const old = frame.contentDocument
    if (!old) throw new Error('The initial chat document must exist.')
    const nextFrame = document.createElement('iframe')
    document.body.append(nextFrame)
    const next = nextFrame.contentDocument
    if (!next) throw new Error('The next chat document must exist.')
    Object.defineProperty(frame, 'contentDocument', { configurable: true, get: () => next })
    const nodeType = vi.spyOn(old, 'nodeType', 'get').mockImplementation(() => {
      throw new TypeError('revoked document')
    })
    const remove = vi.spyOn(old, 'removeEventListener').mockImplementation(() => {
      throw new TypeError('revoked document')
    })
    try {
      fireEvent.load(frame)
      expect(fireEvent.keyDown(next.body, { key: 'Escape' })).toBe(false)
      expect(dismiss).toHaveBeenCalledOnce()
      view.unmount()
      expect(fireEvent.keyDown(next.body, { key: 'Escape' })).toBe(true)
      expect(dismiss).toHaveBeenCalledOnce()
    } finally {
      nodeType.mockRestore()
      remove.mockRestore()
      nextFrame.remove()
    }
  })

  it('ignores an already revoked replacement and follows the next accessible document', () => {
    const dismiss = vi.fn()
    const view = render(<Harness visible dismiss={dismiss} />)
    const frame = view.getByTitle('Native chat') as HTMLIFrameElement
    const old = frame.contentDocument
    if (!old) throw new Error('The initial chat document must exist.')
    const deadFrame = document.createElement('iframe')
    const nextFrame = document.createElement('iframe')
    document.body.append(deadFrame, nextFrame)
    const dead = deadFrame.contentDocument
    const next = nextFrame.contentDocument
    if (!dead || !next) throw new Error('Replacement chat documents must exist.')
    let currentDocument = dead
    Object.defineProperty(frame, 'contentDocument', { configurable: true, get: () => currentDocument })
    const nodeType = vi.spyOn(dead, 'nodeType', 'get').mockImplementation(() => {
      throw new TypeError('revoked document')
    })
    const body = vi.spyOn(dead, 'body', 'get').mockImplementation(() => {
      throw new TypeError('revoked document')
    })
    const defaultView = vi.spyOn(dead, 'defaultView', 'get').mockImplementation(() => {
      throw new TypeError('revoked document')
    })
    try {
      fireEvent.load(frame)
      expect(fireEvent.keyDown(old.body, { key: 'Escape' })).toBe(true)
      currentDocument = next
      fireEvent.load(frame)
      expect(fireEvent.keyDown(next.body, { key: 'Escape' })).toBe(false)
      expect(dismiss).toHaveBeenCalledOnce()
      view.unmount()
      expect(fireEvent.keyDown(next.body, { key: 'Escape' })).toBe(true)
    } finally {
      nodeType.mockRestore()
      body.mockRestore()
      defaultView.mockRestore()
      deadFrame.remove()
      nextFrame.remove()
    }
  })
})
