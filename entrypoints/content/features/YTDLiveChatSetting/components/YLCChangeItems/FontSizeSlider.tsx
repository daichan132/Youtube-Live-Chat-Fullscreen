import React, { useCallback, useRef } from 'react'

import { useShallow } from 'zustand/react/shallow'

import { useYLCFontSizeChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCFontSizeChange'
import { useYTDLiveChatStore } from '@/shared/stores'
import { SettingSliderUI, useSettingSlider } from './SettingSlider'

const minSize = 10
const maxSize = 40

export const fontSizeToSliderValue = (fontSize: number) => {
  return ((fontSize - minSize) * 100) / ((maxSize - minSize) * 100)
}

const sliderValueToFontSize = (value: number) => {
  return Math.round((value * ((maxSize - minSize) * 100)) / 100 + minSize)
}

export const FontSizeSlider = () => {
  const fontSizeRef = useRef(useYTDLiveChatStore.getState().fontSize)
  const { updateYLCStyle } = useYTDLiveChatStore(useShallow(state => ({ updateYLCStyle: state.updateYLCStyle })))
  const { changeFontSize } = useYLCFontSizeChange()
  const updateFontSize = useCallback(
    (fontSize: number) => {
      updateYLCStyle({ fontSize })
      changeFontSize(fontSize)
    },
    [changeFontSize, updateYLCStyle],
  )

  const { value, ref } = useSettingSlider<HTMLDivElement>({
    initialValue: fontSizeRef.current,
    toSliderValue: fontSizeToSliderValue,
    fromSliderValue: sliderValueToFontSize,
    onChange: updateFontSize,
  })

  return <FontSizeSliderUI value={value} ref={ref} />
}

export const FontSizeSliderUI = React.forwardRef<HTMLDivElement, { value: number }>(({ value }, ref) => {
  const fontSize = sliderValueToFontSize(value)
  return <SettingSliderUI value={value} ref={ref} aria-label='Font size' aria-valuetext={`${Math.round(fontSize)}px`} />
})

FontSizeSliderUI.displayName = 'FontSizeSlider'
