import React, { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useYLCStylePropertyChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCStylePropertyChange'
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
  const updateYLCStyle = useYTDLiveChatStore(state => state.updateYLCStyle)
  const { setProperty } = useYLCStylePropertyChange()
  const updateFontSize = useCallback(
    (fontSize: number) => {
      updateYLCStyle({ fontSize })
      setProperty('--extension-yt-live-chat-font-size', `${fontSize}px`)
    },
    [setProperty, updateYLCStyle],
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
  const { t } = useTranslation()
  const fontSize = sliderValueToFontSize(value)
  return <SettingSliderUI value={value} ref={ref} aria-label={t('content.setting.fontSize')} aria-valuetext={`${Math.round(fontSize)}px`} />
})

FontSizeSliderUI.displayName = 'FontSizeSlider'
