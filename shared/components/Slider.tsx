import { forwardRef } from 'react'

interface SliderProps {
  value: number
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(({ value }, ref) => {
  const clampedValue = Math.min(1, Math.max(0, value))
  const position = `${clampedValue * 100}%`

  return (
    <div ref={ref} className='ylc-slider ylc-action-fill'>
      <div className='ylc-slider-track' />
      <div className='ylc-slider-fill' style={{ width: position }} />
      <div className='ylc-slider-thumb' style={{ left: position }} />
    </div>
  )
})
