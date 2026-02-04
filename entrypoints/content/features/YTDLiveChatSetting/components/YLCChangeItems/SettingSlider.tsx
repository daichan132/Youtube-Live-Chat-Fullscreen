import React from 'react'
import { Slider } from '@/shared/components/Slider'
import { useInitializedSlider } from '@/shared/hooks/useInitializedSlider'

type SettingSliderOptions = {
  initialValue: number
  toSliderValue: (value: number) => number
  fromSliderValue: (value: number) => number
  onChange: (value: number) => void
}

export const useSettingSlider = <TElement extends HTMLElement>({
  initialValue,
  toSliderValue,
  fromSliderValue,
  onChange,
}: SettingSliderOptions) => {
  const { value, ref } = useInitializedSlider<TElement>({
    initialValue: toSliderValue(initialValue),
    onScrub: newValue => {
      onChange(fromSliderValue(newValue))
    },
  })

  return { value, ref }
}

export const SettingSliderUI = React.forwardRef<HTMLDivElement, { value: number }>(({ value }, ref) => {
  return <Slider value={value} ref={ref} />
})

SettingSliderUI.displayName = 'SettingSlider'
