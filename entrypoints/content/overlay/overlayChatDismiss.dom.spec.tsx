import { fireEvent, render } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useOverlayMenuDismiss } from './useOverlayMenuDismiss'
import { useOverlayTooltipDismiss } from './useOverlayTooltipDismiss'

const Harness = ({ active, mode, dismiss }: { active: boolean; mode: 'menu' | 'tooltip'; dismiss: () => void }) => {
  const rail = useRef<HTMLDivElement>(null)
  useOverlayMenuDismiss(active && mode === 'menu', rail, dismiss)
  useOverlayTooltipDismiss(active && mode === 'tooltip', rail, dismiss)
  return (
    <div data-ylc-resizable>
      <iframe title='Native chat' data-ylc-chat />
      <div ref={rail} />
    </div>
  )
}

describe('overlay dismissal across chat document replacement', () => {
  it.each(['menu', 'tooltip'] as const)('ignores a queued %s event from a revoked document', mode => {
    const dismiss = vi.fn()
    const view = render(<Harness active={false} mode={mode} dismiss={dismiss} />)
    const frame = view.getByTitle('Native chat') as HTMLIFrameElement
    const old = frame.contentDocument
    if (!old) throw new Error('The original chat document must exist.')
    const addListener = vi.spyOn(old, 'addEventListener')
    view.rerender(<Harness active mode={mode} dismiss={dismiss} />)
    const eventType = mode === 'menu' ? 'pointerdown' : 'keydown'
    const oldHandler = addListener.mock.calls.find(([type]) => type === eventType)?.[1]
    if (typeof oldHandler !== 'function') throw new Error('The chat dismissal listener must exist.')

    const nextFrame = document.createElement('iframe')
    document.body.append(nextFrame)
    const next = nextFrame.contentDocument
    if (!next) throw new Error('The replacement chat document must exist.')
    Object.defineProperty(frame, 'contentDocument', { configurable: true, get: () => next })
    const nodeType = vi.spyOn(old, 'nodeType', 'get').mockImplementation(() => {
      throw new TypeError('revoked document')
    })
    try {
      fireEvent.load(frame)
      const oldEvent =
        mode === 'menu'
          ? new MouseEvent('pointerdown', { cancelable: true })
          : new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
      expect(() => oldHandler.call(old, oldEvent)).not.toThrow()
      expect(oldEvent.defaultPrevented).toBe(false)
      expect(dismiss).not.toHaveBeenCalled()

      if (mode === 'menu') expect(fireEvent.pointerDown(next.body)).toBe(true)
      else expect(fireEvent.keyDown(next.body, { key: 'Escape' })).toBe(false)
      expect(dismiss).toHaveBeenCalledOnce()
      view.unmount()
      if (mode === 'menu') fireEvent.pointerDown(next.body)
      else fireEvent.keyDown(next.body, { key: 'Escape' })
      expect(dismiss).toHaveBeenCalledOnce()
    } finally {
      nodeType.mockRestore()
      nextFrame.remove()
    }
  })
})
