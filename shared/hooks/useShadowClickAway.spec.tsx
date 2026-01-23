import { render } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useShadowClickAway } from './useShadowClickAway'

const TestComponent = ({ onClickAway }: { onClickAway: () => void }) => {
  const ref = useRef<HTMLDivElement>(null)
  useShadowClickAway(ref, onClickAway)
  return <div data-testid='box' ref={ref} />
}

describe('useShadowClickAway', () => {
  it('calls onClickAway only when clicking outside the ref element', () => {
    const onClickAway = vi.fn()
    const { getByTestId } = render(<TestComponent onClickAway={onClickAway} />)
    const box = getByTestId('box')

    const insideEvent = new MouseEvent('mousedown', { bubbles: true })
    Object.defineProperty(insideEvent, 'composedPath', {
      value: () => [box],
    })
    box.dispatchEvent(insideEvent)

    expect(onClickAway).not.toHaveBeenCalled()

    const outsideEvent = new MouseEvent('mousedown', { bubbles: true })
    Object.defineProperty(outsideEvent, 'composedPath', {
      value: () => [document.body],
    })
    document.body.dispatchEvent(outsideEvent)

    expect(onClickAway).toHaveBeenCalledTimes(1)
  })
})
