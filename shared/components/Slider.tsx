import { forwardRef, memo } from 'react'

interface SliderProps {
  value: number
  'aria-label'?: string
  'aria-valuetext'?: string
}

export const Slider = memo(
  forwardRef<HTMLDivElement, SliderProps>(({ value, 'aria-label': ariaLabel, 'aria-valuetext': ariaValuetext }, ref) => {
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
        aria-valuetext={ariaValuetext}
        tabIndex={0}
      >
        <div className='ylc-slider-track' />
        <div className='ylc-slider-fill' style={{ width: position }} />
        <div className='ylc-slider-thumb' style={{ left: position }} />
      </div>
    )
  }),
)
Slider.displayName = 'Slider'
