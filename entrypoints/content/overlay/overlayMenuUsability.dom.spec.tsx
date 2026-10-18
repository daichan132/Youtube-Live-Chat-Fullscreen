import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OverlayControlRail } from './OverlayControlRail'

const props = {
  isDragging: false,
  isReady: true,
  isVisible: true,
  placement: { top: 20, right: 0 },
  backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
  fontColor: { r: 255, g: 255, b: 255, a: 1 },
  onSettingsClick: () => {},
  onPointerDown: () => {},
  onKeyDown: () => {},
  onEnterControls: () => {},
  onLeaveControls: () => {},
}
const placement = () => screen.getByRole('button', { name: 'content.placement.open' })

describe('overlay menu dismissal and visual help', () => {
  it('dismisses outside without preventing the ordinary outside click', () => {
    const click = vi.fn()
    render(
      <>
        <OverlayControlRail {...props} />
        <button type='button' onClick={click}>
          Outside
        </button>
      </>,
    )
    fireEvent.click(placement())
    expect(placement()).toHaveAttribute('aria-expanded', 'true')
    const outside = screen.getByRole('button', { name: 'Outside' })
    expect(fireEvent.pointerDown(outside)).toBe(true)
    fireEvent.click(outside)
    expect(placement()).toHaveAttribute('aria-expanded', 'false')
    expect(click).toHaveBeenCalledOnce()
  })

  it('dismisses inside the currently attached chat document and releases the replaced document', async () => {
    const view = render(
      <div data-ylc-resizable>
        <iframe title='Native chat' data-ylc-chat />
        <OverlayControlRail {...props} />
      </div>,
    )
    const oldFrame = screen.getByTitle('Native chat') as HTMLIFrameElement
    const oldDocument = oldFrame.contentDocument
    if (!oldDocument) throw new Error('Expected the initial same-origin chat document')
    fireEvent.click(placement())
    fireEvent.pointerDown(oldDocument.body)
    expect(placement()).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(placement())
    const next = document.createElement('iframe')
    next.setAttribute('data-ylc-chat', '')
    await act(async () => {
      oldFrame.replaceWith(next)
    })
    fireEvent.pointerDown(oldDocument.body)
    expect(placement()).toHaveAttribute('aria-expanded', 'true')
    if (!next.contentDocument) throw new Error('Expected the replacement same-origin chat document')
    fireEvent.pointerDown(next.contentDocument.body)
    expect(placement()).toHaveAttribute('aria-expanded', 'false')
    view.unmount()
  })

  it('closes before opening settings and stays closed when runtime readiness returns', () => {
    const onSettingsClick = vi.fn()
    const view = render(<OverlayControlRail {...props} onSettingsClick={onSettingsClick} />)
    fireEvent.click(placement())
    fireEvent.click(screen.getByRole('button', { name: 'content.aria.openSettings' }))
    expect(placement()).toHaveAttribute('aria-expanded', 'false')
    expect(onSettingsClick).toHaveBeenCalledOnce()
    fireEvent.click(placement())
    view.rerender(<OverlayControlRail {...props} isReady={false} />)
    view.rerender(<OverlayControlRail {...props} />)
    expect(placement()).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows localized visual help for hover and focus, without covering an open menu or gesture', () => {
    vi.useFakeTimers()
    const view = render(<OverlayControlRail {...props} />)
    const settings = screen.getByRole('button', { name: 'content.aria.openSettings' })
    const drag = screen.getByRole('button', { name: 'content.aria.dragToMove' })
    fireEvent.mouseEnter(settings)
    act(() => vi.advanceTimersByTime(200))
    expect(view.container.querySelector('[data-ylc-control-tooltip]')).toHaveTextContent('content.aria.openSettings')
    // jsdom does not model the browser's keyboard/pointer focus modality.
    // Real-input fixture coverage verifies its :focus-visible decision.
    const matches = drag.matches.bind(drag)
    const keyboardFocus = vi.spyOn(drag, 'matches').mockImplementation(selector => selector === ':focus-visible' || matches(selector))
    act(() => drag.focus())
    keyboardFocus.mockRestore()
    expect(view.container.querySelector('[data-ylc-control-tooltip]')).toHaveTextContent('content.aria.dragToMove')
    fireEvent.click(placement())
    expect(view.container.querySelector('[data-ylc-control-tooltip]')).toBeNull()
    fireEvent.click(placement())
    view.rerender(<OverlayControlRail {...props} isDragging />)
    expect(view.container.querySelector('[data-ylc-control-tooltip]')).toBeNull()
    vi.useRealTimers()
  })

  it('keeps the placement menu open when directly resizing its own frame', () => {
    render(
      <div data-ylc-resizable>
        <div data-ylc-resize-direction='right' data-testid='resize' />
        <OverlayControlRail {...props} />
      </div>,
    )
    fireEvent.click(placement())
    fireEvent.pointerDown(screen.getByTestId('resize'))
    expect(placement()).toHaveAttribute('aria-expanded', 'true')
  })
  it('waits 200ms on each hovered icon and cancels pending help on leave or unmount', () => {
    vi.useFakeTimers()
    try {
      const view = render(<OverlayControlRail {...props} />)
      const settings = screen.getByRole('button', { name: 'content.aria.openSettings' })
      const drag = screen.getByRole('button', { name: 'content.aria.dragToMove' })
      const tooltip = () => view.container.querySelector('[data-ylc-control-tooltip]')
      fireEvent.mouseEnter(settings)
      act(() => vi.advanceTimersByTime(199))
      expect(tooltip()).toBeNull()
      act(() => vi.advanceTimersByTime(1))
      expect(tooltip()).toHaveTextContent('content.aria.openSettings')
      fireEvent.mouseLeave(settings)
      expect(tooltip()).toBeNull()
      fireEvent.mouseEnter(drag)
      act(() => vi.advanceTimersByTime(100))
      fireEvent.mouseLeave(drag)
      act(() => vi.advanceTimersByTime(200))
      expect(tooltip()).toBeNull()
      fireEvent.mouseEnter(settings)
      view.unmount()
      act(() => vi.advanceTimersByTime(200))
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
