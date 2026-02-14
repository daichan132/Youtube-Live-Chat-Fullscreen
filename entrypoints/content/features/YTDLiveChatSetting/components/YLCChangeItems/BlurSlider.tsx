import React, { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useShallow } from 'zustand/react/shallow'

import { useYLCBlurChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCBlurChange'
import { useYTDLiveChatStore } from '@/shared/stores'
import { SettingSliderUI, useSettingSlider } from './SettingSlider'

export const BlurToSliderValue = (blur: number) => {
  return blur / 20
}

const sliderValueToBlur = (value: number) => {
  return Math.round(value * 20)
}

export const BlurSlider = () => {
  const blurRef = useRef(useYTDLiveChatStore.getState().blur)
  const { updateYLCStyle } = useYTDLiveChatStore(useShallow(state => ({ updateYLCStyle: state.updateYLCStyle })))
  const { changeBlur } = useYLCBlurChange()
  const updateBlur = useCallback(
    (blur: number) => {
      updateYLCStyle({ blur })
      changeBlur(blur)
    },
    [changeBlur, updateYLCStyle],
  )
  const { value, ref } = useSettingSlider<HTMLDivElement>({
    initialValue: blurRef.current,
    toSliderValue: BlurToSliderValue,
    fromSliderValue: sliderValueToBlur,
    onChange: updateBlur,
  })
  return <BlurSliderUI value={value} ref={ref} />
}

export const BlurSliderUI = React.forwardRef<HTMLDivElement, { value: number }>(({ value }, ref) => {
  const { t } = useTranslation()
  const blur = sliderValueToBlur(value)
  return <SettingSliderUI value={value} ref={ref} aria-label={t('content.setting.blur')} aria-valuetext={`${Math.round(blur)}px`} />
})

BlurSliderUI.displayName = 'BlurSlider'
