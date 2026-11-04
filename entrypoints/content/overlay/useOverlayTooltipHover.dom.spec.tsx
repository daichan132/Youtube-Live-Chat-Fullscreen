import { act, fireEvent, render } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useOverlayTooltipHover } from './useOverlayTooltipHover'

const Harness = ({ active, leave }: { active: boolean; leave: () => void }) => {
  const rail = useRef<HTMLDivElement>(null)
  const tooltip = useRef<HTMLDivElement>(null)
  useOverlayTooltipHover(active, rail, tooltip, '[data-help-trigger]', leave)
  return (
    <div data-ylc-resizable>
      <iframe title='Native chat' data-ylc-chat />
      <div ref={rail}>
        <button type='button' data-help-trigger>
          Settings
        </button>
        <div ref={tooltip}>Help</div>
      </div>
    </div>
  )
}

const move = (target: Document, x: number, y: number) =>
  fireEvent(target, new MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: x, clientY: y }))

const setBounds = (view: ReturnType<typeof render>) => {
  vi.spyOn(view.getByRole('button'), 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 40, 40))
  vi.spyOn(view.getByText('Help'), 'getBoundingClientRect').mockReturnValue(new DOMRect(80, 146, 80, 40))
}

const setChatBounds = (frame: HTMLIFrameElement) => {
  vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue(new DOMRect(50, 50, 200, 200))
  if (!frame.contentWindow || !frame.contentDocument) throw new Error('The chat viewport must exist.')
  Object.defineProperty(frame.contentWindow, 'innerWidth', { configurable: true, value: 400 })
  Object.defineProperty(frame.contentWindow, 'innerHeight', { configurable: true, value: 400 })
  return frame.contentDocument
}

describe('click-through tooltip hover region', () => {
  it('retains the trigger, its short gap, and help while releasing on outside movement, hiding, and unmount', () => {
    const leave = vi.fn()
    const view = render(<Harness active leave={leave} />)
    setBounds(view)
    expect(move(document, 120, 120)).toBe(true)
    expect(move(document, 120, 143)).toBe(true)
    expect(move(document, 100, 170)).toBe(true)
    expect(leave).not.toHaveBeenCalled()
    expect(move(document, 300, 300)).toBe(true)
    expect(leave).toHaveBeenCalledOnce()

    view.rerender(<Harness active={false} leave={leave} />)
    move(document, 300, 300)
    expect(leave).toHaveBeenCalledOnce()
    view.rerender(<Harness active leave={leave} />)
    view.unmount()
    move(document, 300, 300)
    expect(leave).toHaveBeenCalledOnce()
  })

  it('converts native iframe pointer coordinates and follows replacement without retaining old documents', async () => {
    const leave = vi.fn()
    const view = render(<Harness active leave={leave} />)
    setBounds(view)
    const original = view.getByTitle('Native chat') as HTMLIFrameElement
    const originalDocument = setChatBounds(original)
    // The iframe's 400px viewport is painted at half scale with a 50px offset.
    // Its (100, 240) pointer is therefore over help at owner point (100, 170).
    expect(move(originalDocument, 100, 240)).toBe(true)
    expect(leave).not.toHaveBeenCalled()
    move(originalDocument, 0, 0)
    expect(leave).toHaveBeenCalledOnce()

    const replacement = document.createElement('iframe')
    replacement.setAttribute('data-ylc-chat', '')
    await act(async () => original.replaceWith(replacement))
    const replacementDocument = setChatBounds(replacement)
    move(originalDocument, 0, 0)
    expect(leave).toHaveBeenCalledOnce()
    move(replacementDocument, 100, 240)
    expect(leave).toHaveBeenCalledOnce()
    move(replacementDocument, 0, 0)
    expect(leave).toHaveBeenCalledTimes(2)
    view.unmount()
    move(replacementDocument, 0, 0)
    expect(leave).toHaveBeenCalledTimes(2)
  })

  it('ignores a queued pointermove from a revoked document and follows its replacement', () => {
    const leave = vi.fn()
    const view = render(<Harness active={false} leave={leave} />)
    setBounds(view)
    const frame = view.getByTitle('Native chat') as HTMLIFrameElement
    const old = setChatBounds(frame)
    const addListener = vi.spyOn(old, 'addEventListener')
    view.rerender(<Harness active leave={leave} />)
    const oldHandler = addListener.mock.calls.find(([type]) => type === 'pointermove')?.[1]
    if (typeof oldHandler !== 'function') throw new Error('The chat pointer listener must exist.')

    const nextFrame = document.createElement('iframe')
    document.body.append(nextFrame)
    const next = setChatBounds(nextFrame)
    Object.defineProperty(frame, 'contentDocument', { configurable: true, get: () => next })
    const nodeType = vi.spyOn(old, 'nodeType', 'get').mockImplementation(() => {
      throw new TypeError('revoked document')
    })
    const defaultView = vi.spyOn(old, 'defaultView', 'get').mockImplementation(() => {
      throw new TypeError('revoked document')
    })
    try {
      fireEvent.load(frame)
      expect(() => oldHandler.call(old, new MouseEvent('pointermove', { clientX: 0, clientY: 0 }))).not.toThrow()
      expect(leave).not.toHaveBeenCalled()
      move(next, 100, 240)
      expect(leave).not.toHaveBeenCalled()
      move(next, 0, 0)
      expect(leave).toHaveBeenCalledOnce()
      view.unmount()
      move(next, 0, 0)
      expect(leave).toHaveBeenCalledOnce()
    } finally {
      nodeType.mockRestore()
      defaultView.mockRestore()
      nextFrame.remove()
    }
  })
})
