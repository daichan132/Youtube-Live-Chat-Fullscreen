import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { RgbaColor } from 'react-colorful'
import { RgbaColorPicker } from 'react-colorful'
import { useShadowClickAway } from '@/shared/hooks/useShadowClickAway'
import { useT } from '@/shared/i18n/react'
import type { RGBA } from '@/shared/settings/model'
import { formatColorValue, getPreviewBorderColor, toRgba } from './colorUtils'
import { useEnsureSettingPanelVisibility } from './useEnsureSettingPanelVisibility'

type SettingColorPickerProps = {
  rgba: RGBA
  label: string
  onChange: (color: RgbaColor) => void
  onInteractionStart?: () => void
  onInteractionEnd?: () => void
}

const COLOR_ADJUSTMENT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'])

export const SettingColorPicker = ({ rgba, label, onChange, onInteractionStart, onInteractionEnd }: SettingColorPickerProps) => {
  const t = useT()
  const descriptionId = useId()
  const fieldLabelId = useId()
  const pickerId = useId()
  const [display, setDisplay] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const previewBorderColor = getPreviewBorderColor(rgba)
  const closePicker = useCallback((returnFocus = false) => {
    setDisplay(false)
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true })
  }, [])

  useEnsureSettingPanelVisibility({ isOpen: display, anchorRef: triggerRef, popupRef: menuRef })
  useShadowClickAway(rootRef, () => closePicker())

  useEffect(() => {
    if (!display) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      closePicker(true)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closePicker, display])

  useEffect(() => {
    if (!display) return
    // Closing or removing the picker finishes the current gesture once.
    return () => onInteractionEnd?.()
  }, [display, onInteractionEnd])

  const handleLocalKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!display || event.nativeEvent.isComposing || event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    closePicker(true)
  }
  const handleFocusLeave = (event: React.FocusEvent<HTMLElement>) => {
    if (!display) return
    if (event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget)) return
    closePicker()
  }

  return (
    <div ref={rootRef} className='relative ylc-action-fill'>
      <span id={fieldLabelId} className='ylc-visually-hidden'>
        {label}
      </span>
      <span id={descriptionId} dir='ltr' className='ylc-visually-hidden'>
        {`rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`}
      </span>
      <button
        ref={triggerRef}
        type='button'
        aria-label={label}
        aria-describedby={descriptionId}
        aria-haspopup='dialog'
        aria-controls={display ? pickerId : undefined}
        aria-expanded={display}
        className='ylc-color-trigger ylc-action-fill'
        onClick={event => {
          if (!display) event.currentTarget.focus({ preventScroll: true })
          setDisplay(current => !current)
        }}
        onKeyDown={handleLocalKeyDown}
        onBlur={handleFocusLeave}
      >
        <span className='ylc-color-swatch'>
          <span
            className='ylc-color-swatch-fill'
            style={{
              backgroundColor: `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`,
              borderColor: previewBorderColor,
            }}
          />
        </span>
        <bdi dir='ltr' className='ylc-color-value'>
          {formatColorValue(rgba)}
        </bdi>
      </button>
      {display ? (
        <div
          ref={menuRef}
          id={pickerId}
          className='absolute end-0 ylc-theme-popover ylc-color-popover'
          role='dialog'
          aria-label={t('content.aria.colorPicker')}
          aria-describedby={fieldLabelId}
          onKeyDown={handleLocalKeyDown}
          onBlur={handleFocusLeave}
          onPointerDownCapture={onInteractionStart}
          onPointerUpCapture={onInteractionEnd}
          onPointerCancelCapture={onInteractionEnd}
          onLostPointerCapture={onInteractionEnd}
          onKeyDownCapture={event => {
            if (COLOR_ADJUSTMENT_KEYS.has(event.key)) onInteractionStart?.()
          }}
          onKeyUpCapture={event => {
            if (COLOR_ADJUSTMENT_KEYS.has(event.key)) onInteractionEnd?.()
          }}
        >
          {/* The library's slider names and value text are English, even in a translated dialog. */}
          <RgbaColorPicker lang='en' dir='ltr' color={toRgba(rgba)} onChange={onChange} onChangeEnd={onInteractionEnd} />
        </div>
      ) : null}
    </div>
  )
}
