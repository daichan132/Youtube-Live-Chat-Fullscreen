import { atom, useAtomValue, useStore } from 'jotai'
import type { CSSProperties } from 'react'
import { useCallback, useId, useMemo } from 'react'
import type { TranslationKey } from '@/shared/i18n/generated/translationTypes'
import { useT } from '@/shared/i18n/react'
import { APPEARANCE_NUMBER_LIMITS, type AppearanceNumberKey } from '@/shared/settings/appearanceLimits'
import { effectiveAppearanceAtoms } from '@/shared/state'
import { editorSessionStateAtom } from '@/shared/state/atoms'
import { useStyleHistoryCommands } from '../../styleHistoryCommands'

export type NumberSliderSettingKey = AppearanceNumberKey

type YLCNumberSliderProps = {
  settingKey: NumberSliderSettingKey
  labelKey: TranslationKey
}

const RANGE_ADJUSTMENT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'])

export const YLCNumberSlider = ({ settingKey, labelKey }: YLCNumberSliderProps) => {
  const { min, max } = APPEARANCE_NUMBER_LIMITS[settingKey]
  const t = useT()
  const store = useStore()
  const storeValue = useAtomValue(effectiveAppearanceAtoms[settingKey])
  const { beginYLCStyleGesture, commitYLCStyleUpdate, finishYLCStyleGesture, previewYLCStyleUpdate } = useStyleHistoryCommands()
  const gestureId = `range:${settingKey}`
  const isAdjusting = useAtomValue(useMemo(() => atom(get => get(editorSessionStateAtom).activeGesture?.id === gestureId), [gestureId]))
  const unit = settingKey === 'textShadow' ? '%' : 'px'
  const anchorName = `--ylc-range-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  const value = Math.min(max, Math.max(min, storeValue))
  const displayValue = Math.round(storeValue)
  const ratio = (value - min) / (max - min)
  const valueText = `${displayValue}${unit}`
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(event.target.value)
      const patch = { appearance: { [settingKey]: next } }
      if (store.get(editorSessionStateAtom).activeGesture?.id === gestureId) {
        previewYLCStyleUpdate(gestureId, patch)
      } else {
        // Native accessibility input has no pointer/key gesture to finish.
        // Commit it now so removing the settings iframe cannot lose the change.
        commitYLCStyleUpdate(patch)
      }
    },
    [commitYLCStyleUpdate, gestureId, previewYLCStyleUpdate, settingKey, store],
  )
  const beginGesture = useCallback(() => beginYLCStyleGesture(gestureId), [beginYLCStyleGesture, gestureId])
  const finishGesture = useCallback(() => finishYLCStyleGesture(gestureId), [finishYLCStyleGesture, gestureId])

  return (
    <div
      className='ylc-range-field'
      style={
        {
          '--ylc-range-anchor': anchorName,
          '--ylc-range-progress': `${ratio * 100}%`,
          '--ylc-range-ratio': ratio,
        } as CSSProperties
      }
    >
      <input
        type='range'
        className='ylc-range'
        min={min}
        max={max}
        step={1}
        value={value}
        aria-label={t(labelKey)}
        aria-valuetext={valueText}
        onChange={handleChange}
        onPointerDown={event => {
          event.currentTarget.focus({ preventScroll: true })
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
      {isAdjusting && (
        <span className='ylc-range-feedback' dir='ltr' aria-hidden='true'>
          {valueText}
        </span>
      )}
    </div>
  )
}
