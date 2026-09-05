import { useAtomValue } from 'jotai'
import type { CSSProperties } from 'react'
import { useCallback } from 'react'
import type { TranslationKey } from '@/shared/i18n/generated/translationTypes'
import { useT } from '@/shared/i18n/react'
import { effectiveProfileAtom } from '@/shared/state'
import { useStyleHistoryCommands } from '../../styleHistoryCommands'

export type NumberSliderSettingKey = 'fontSize' | 'blur' | 'spacing'

type YLCNumberSliderProps = {
  settingKey: NumberSliderSettingKey
  labelKey: TranslationKey
  min: number
  max: number
}

const RANGE_ADJUSTMENT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'])

export const YLCNumberSlider = ({ settingKey, labelKey, min, max }: YLCNumberSliderProps) => {
  const t = useT()
  const storeValue = useAtomValue(effectiveProfileAtom).appearance[settingKey]
  const { beginYLCStyleGesture, finishYLCStyleGesture, previewYLCStyleUpdate } = useStyleHistoryCommands()
  const gestureId = `range:${settingKey}`

  const value = Math.min(max, Math.max(min, storeValue))
  const displayValue = Math.round(storeValue)
  const progress = `${((value - min) / (max - min)) * 100}%`

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(event.target.value)
      previewYLCStyleUpdate(gestureId, { appearance: { [settingKey]: next } }, settingKey)
    },
    [gestureId, settingKey],
  )
  const beginGesture = useCallback(() => beginYLCStyleGesture(gestureId, settingKey), [gestureId, settingKey])
  const finishGesture = useCallback(() => finishYLCStyleGesture(gestureId), [gestureId])

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
        onPointerDown={event => {
          event.currentTarget.setPointerCapture?.(event.pointerId)
          beginGesture()
        }}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
        onLostPointerCapture={finishGesture}
        onKeyDown={event => {
          if (RANGE_ADJUSTMENT_KEYS.has(event.key)) beginGesture()
        }}
        onKeyUp={event => {
          if (RANGE_ADJUSTMENT_KEYS.has(event.key)) finishGesture()
        }}
        onBlur={finishGesture}
      />
      <output className='ylc-range-value' aria-hidden='true'>
        {displayValue}px
      </output>
    </div>
  )
}
