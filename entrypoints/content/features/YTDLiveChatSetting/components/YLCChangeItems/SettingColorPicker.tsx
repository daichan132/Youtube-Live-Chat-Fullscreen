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

  return (
    <div ref={rootRef} className='relative ylc-action-fill'>
      <span id={descriptionId} className='ylc-visually-hidden'>
        {`Current color: rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`}
      </span>
      <button
        ref={triggerRef}
        type='button'
        aria-label={label}
        aria-describedby={descriptionId}
        aria-haspopup='dialog'
        aria-expanded={display}
        className='ylc-color-trigger ylc-action-fill'
        onClick={() => setDisplay(current => !current)}
        onKeyDown={handleLocalKeyDown}
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
        <span className='ylc-color-value'>{formatColorValue(rgba)}</span>
      </button>
      {display ? (
        <div
          ref={menuRef}
          className='absolute right-0 ylc-theme-popover'
          role='dialog'
          aria-label={t('content.aria.colorPicker')}
          onKeyDown={handleLocalKeyDown}
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
          <RgbaColorPicker color={toRgba(rgba)} onChange={onChange} onChangeEnd={onInteractionEnd} />
        </div>
      ) : null}
    </div>
  )
}
