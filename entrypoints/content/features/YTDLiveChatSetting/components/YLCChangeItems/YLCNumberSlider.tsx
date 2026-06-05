import type { CSSProperties } from 'react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useYTDLiveChatStore } from '@/shared/stores'
import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'

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
  const storeValue = useYTDLiveChatStore(state => state[settingKey])
  const updateYLCStyle = useYTDLiveChatStore(state => state.updateYLCStyle)

  const value = Math.min(max, Math.max(min, storeValue))
  const displayValue = Math.round(storeValue)
  const progress = `${((value - min) / (max - min)) * 100}%`

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(event.target.value)
      updateYLCStyle({ [settingKey]: next } as Pick<YLCStyleUpdateType, NumberSliderSettingKey>)
      applyValue(next)
    },
    [applyValue, settingKey, updateYLCStyle],
  )

  return (
    <div className='ylc-range-field'>
      <input
        type='range'
        className='ylc-range'
        min={min}
        max={max}
        step={1}
        value={value}
        aria-label={t(labelKey)}
        aria-valuetext={`${displayValue}px`}
        style={{ '--ylc-range-progress': progress } as CSSProperties}
        onChange={handleChange}
      />
      <output className='ylc-range-value' aria-hidden='true'>
        {displayValue}px
      </output>
    </div>
  )
}
