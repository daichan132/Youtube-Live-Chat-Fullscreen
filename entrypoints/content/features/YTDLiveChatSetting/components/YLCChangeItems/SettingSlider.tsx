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

export const SettingSliderUI = React.forwardRef<HTMLDivElement, { value: number; 'aria-label'?: string; 'aria-valuetext'?: string }>(
  ({ value, 'aria-label': ariaLabel, 'aria-valuetext': ariaValuetext }, ref) => {
    return <Slider value={value} ref={ref} aria-label={ariaLabel} aria-valuetext={ariaValuetext} />
  },
)

SettingSliderUI.displayName = 'SettingSlider'
