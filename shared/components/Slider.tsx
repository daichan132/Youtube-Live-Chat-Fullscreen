import { forwardRef } from 'react'

interface SliderProps {
  value: number
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(({ value }, ref) => {
  return (
    <div ref={ref} className='relative w-[150px]'>
      <div className='absolute top-1/2 transform -translate-y-1/2 w-full h-[4px] bg-gray-400 rounded cursor-pointer' />
      <div
        className='absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[12px] h-[12px] border-1 border-solid border-gray-400 bg-white rounded-full shadow cursor-pointer'
        style={{ left: `${value * 100}%` }}
      />
    </div>
  )
})
