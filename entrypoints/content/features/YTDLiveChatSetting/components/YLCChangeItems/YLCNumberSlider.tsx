import { useAtomValue, useStore } from 'jotai'
import type { CSSProperties } from 'react'
import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
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
  const unitId = useId()

  const value = Math.min(max, Math.max(min, storeValue))
  const displayValue = Math.round(storeValue)
  const progress = `${((value - min) / (max - min)) * 100}%`
  const [numberDraft, setNumberDraft] = useState<string | null>(null)
  const numberDraftRef = useRef('')
  const numberBaseRef = useRef(storeValue)
  const numberDirtyRef = useRef(false)
  const composingRef = useRef(false)

  useLayoutEffect(() => {
    // A change to this setting invalidates an unfinished local edit. Changes
    // to other fields remain intact when this field eventually commits.
    if (numberDirtyRef.current && numberBaseRef.current !== storeValue) {
      numberDirtyRef.current = false
      numberDraftRef.current = ''
      setNumberDraft(null)
    }
    numberBaseRef.current = storeValue
  }, [storeValue])

  const restoreNumber = useCallback(() => {
    const current = store.get(effectiveAppearanceAtoms[settingKey])
    const text = String(Math.round(current))
    numberBaseRef.current = current
    numberDirtyRef.current = false
    numberDraftRef.current = text
    setNumberDraft(null)
  }, [settingKey, store])

  const finishNumberEdit = useCallback(() => {
    if (!numberDirtyRef.current) return
    const current = store.get(effectiveAppearanceAtoms[settingKey])
    const text = numberDraftRef.current.trim()
    const next = Number(text)
    if (composingRef.current || current !== numberBaseRef.current || !text || !Number.isFinite(next) || !Number.isInteger(next)) {
      restoreNumber()
      return
    }
    const clamped = Math.min(max, Math.max(min, next))
    numberDirtyRef.current = false
    commitYLCStyleUpdate({ appearance: { [settingKey]: clamped } })
    restoreNumber()
  }, [commitYLCStyleUpdate, max, min, restoreNumber, settingKey, store])

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
          // Commit a previously focused numeric draft before starting this
          // range gesture, so its blur cannot finish the new gesture early.
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
      <span dir='ltr' className='ylc-range-value' style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        <input
          type='number'
          inputMode='numeric'
          min={min}
          max={max}
          step={1}
          value={numberDraft ?? String(displayValue)}
          aria-label={t(labelKey)}
          aria-describedby={unitId}
          className='ylc-number-input ylc-theme-focus-ring-soft'
          style={{
            width: 52,
            minWidth: 0,
            padding: '0 4px',
            boxSizing: 'border-box',
            color: 'var(--ylc-text-primary)',
            font: 'inherit',
            textAlign: 'center',
          }}
          onFocus={restoreNumber}
          onChange={event => {
            numberDirtyRef.current = true
            numberDraftRef.current = event.target.value
            setNumberDraft(event.target.value)
          }}
          onCompositionStart={() => {
            composingRef.current = true
          }}
          onCompositionEnd={() => {
            composingRef.current = false
          }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing || composingRef.current) return
            if (event.key === 'Enter') {
              event.preventDefault()
              finishNumberEdit()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              restoreNumber()
            }
          }}
          onBlur={finishNumberEdit}
        />
        <span id={unitId} aria-hidden='true'>
          px
        </span>
      </span>
    </div>
  )
}
