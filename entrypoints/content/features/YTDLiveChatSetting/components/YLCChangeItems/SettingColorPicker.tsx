import { useEffect, useId, useRef, useState } from 'react'
import type { RgbaColor } from 'react-colorful'
import { RgbaColorPicker } from 'react-colorful'
import { useTranslation } from 'react-i18next'
import { useShadowClickAway } from '@/shared/hooks/useShadowClickAway'
import type { RGBColor } from '@/shared/types/ytdLiveChatType'
import { formatColorValue, getPreviewBorderColor, toRgba } from './colorUtils'
import { useEnsureSettingPanelVisibility } from './useEnsureSettingPanelVisibility'

type SettingColorPickerProps = {
  rgba: RGBColor
  label: string
  onChange: (color: RgbaColor) => void
}

export const SettingColorPicker = ({ rgba, label, onChange }: SettingColorPickerProps) => {
  const { t } = useTranslation()
  const descriptionId = useId()
  const [display, setDisplay] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const previewBorderColor = getPreviewBorderColor(rgba)

  useEnsureSettingPanelVisibility({ isOpen: display, anchorRef: triggerRef, popupRef: menuRef })
  useShadowClickAway(rootRef, () => {
    if (!display) return
    setDisplay(false)
  })

  useEffect(() => {
    if (!display) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setDisplay(false)
        triggerRef.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [display])

  return (
    <div ref={rootRef} className='relative ylc-action-fill'>
      <span
        id={descriptionId}
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
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
        <div ref={menuRef} className='absolute right-0 ylc-theme-popover' role='dialog' aria-label={t('content.aria.colorPicker')}>
          <RgbaColorPicker color={toRgba(rgba)} onChange={onChange} />
        </div>
      ) : null}
    </div>
  )
}
