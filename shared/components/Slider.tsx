import { forwardRef } from 'react'

interface SliderProps {
  value: number
  'aria-label'?: string
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(({ value, 'aria-label': ariaLabel }, ref) => {
  const clampedValue = Math.min(1, Math.max(0, value))
  const position = `${clampedValue * 100}%`

  return (
    <div
      ref={ref}
      className='ylc-slider ylc-action-fill'
      role='slider'
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-label={ariaLabel}
      tabIndex={0}
    >
      <div className='ylc-slider-track' />
      <div className='ylc-slider-fill' style={{ width: position }} />
      <div className='ylc-slider-thumb' style={{ left: position }} />
    </div>
  )
})
