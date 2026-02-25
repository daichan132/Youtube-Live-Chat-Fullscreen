import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useInitializedSlider } from './useInitializedSlider'

const sliderState = vi.hoisted(() => ({
  sliderValue: 0,
  lastOptions: null as null | { onScrub?: (value: number) => void },
}))

vi.mock('./useSlider', () => ({
  useSlider: (_ref: unknown, options: { onScrub?: (value: number) => void }) => {
    sliderState.lastOptions = options
    return { value: sliderState.sliderValue, isSliding: false }
  },
}))

const TestComponent = ({ initialValue, onScrub }: { initialValue: number; onScrub?: (value: number) => void }) => {
  const { value, ref } = useInitializedSlider<HTMLDivElement>({ initialValue, onScrub })
  return (
    <div ref={ref}>
      <span data-testid='value'>{value}</span>
    </div>
  )
}

describe('useInitializedSlider', () => {
  it('returns initialValue until first scrub', () => {
    sliderState.sliderValue = 0.2
    const onScrub = vi.fn()
    const { getByTestId, rerender } = render(<TestComponent initialValue={0.7} onScrub={onScrub} />)

    expect(getByTestId('value')).toHaveTextContent('0.7')

    act(() => {
      sliderState.lastOptions?.onScrub?.(0.2)
    })

    sliderState.sliderValue = 0.2
    rerender(<TestComponent initialValue={0.7} onScrub={onScrub} />)

    expect(onScrub).toHaveBeenCalledTimes(1)
    expect(onScrub).toHaveBeenCalledWith(0.2)
    expect(getByTestId('value')).toHaveTextContent('0.2')
  })
})
