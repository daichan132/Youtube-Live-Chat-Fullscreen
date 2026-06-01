import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Slider } from '@/shared/components/Slider'
import { useYTDLiveChatStore } from '@/shared/stores'
import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { createIntegerRangeSliderScale, useSettingSlider } from './SettingSlider'

export type NumberSliderSettingKey = 'fontSize' | 'blur' | 'space'

type YLCNumberSliderProps = {
  settingKey: NumberSliderSettingKey
  labelKey: string
  min: number
  max: number
  applyValue: (value: number) => void
}

export const YLCNumberSlider = ({ settingKey, labelKey, min, max, applyValue }: YLCNumberSliderProps) => {
  const { t } = useTranslation()
  const initialValue = useYTDLiveChatStore(state => state[settingKey])
  const updateYLCStyle = useYTDLiveChatStore(state => state.updateYLCStyle)
  const sliderScale = useMemo(() => createIntegerRangeSliderScale(min, max), [min, max])

  const updateValue = useCallback(
    (value: number) => {
      updateYLCStyle({ [settingKey]: value } as Pick<YLCStyleUpdateType, NumberSliderSettingKey>)
      applyValue(value)
    },
    [applyValue, settingKey, updateYLCStyle],
  )

  const { value, ref } = useSettingSlider({
    initialValue,
    toSliderValue: sliderScale.toSliderValue,
    fromSliderValue: sliderScale.fromSliderValue,
    onChange: updateValue,
  })
  const displayValue = sliderScale.fromSliderValue(value)

  return <Slider value={value} ref={ref} aria-label={t(labelKey)} aria-valuetext={`${Math.round(displayValue)}px`} />
}
