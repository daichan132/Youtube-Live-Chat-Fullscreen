import { useRef } from 'react'
import { useSlider } from './useSlider'

type SettingSliderOptions = {
  initialValue: number
  toSliderValue: (value: number) => number
  fromSliderValue: (value: number) => number
  onChange: (value: number) => void
}

export const createIntegerRangeSliderScale = (min: number, max: number) => ({
  toSliderValue: (value: number) => (value - min) / (max - min),
  fromSliderValue: (value: number) => Math.round(value * (max - min) + min),
})

export const useSettingSlider = ({ initialValue, toSliderValue, fromSliderValue, onChange }: SettingSliderOptions) => {
  const ref = useRef<HTMLDivElement>(null)
  const touched = useRef(false)
  const sliderInitialValue = toSliderValue(initialValue)
  const lastInitialValue = useRef(sliderInitialValue)

  if (lastInitialValue.current !== sliderInitialValue) {
    lastInitialValue.current = sliderInitialValue
    touched.current = false
  }

  const { value } = useSlider(ref, {
    onScrub: touched.current
      ? newValue => {
          onChange(fromSliderValue(newValue))
        }
      : newValue => {
          touched.current = true
          onChange(fromSliderValue(newValue))
        },
  })

  return { value: touched.current ? value : sliderInitialValue, ref }
}
