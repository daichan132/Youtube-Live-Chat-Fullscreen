import { useEffect, useId, useRef, useState } from 'react'
import type { RgbaColor } from 'react-colorful'
import { RgbaColorPicker } from 'react-colorful'
import { useTranslation } from 'react-i18next'
import { useShadowClickAway } from '@/shared/hooks/useShadowClickAway'
import type { RGBColor } from '@/shared/types/ytdLiveChatType'
import { getPreviewBorderColor, toRgba } from './colorUtils'
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
        className='ylc-action-fill block h-[36px] p-[6px] ylc-theme-surface rounded-[10px] cursor-pointer relative border border-solid ylc-theme-border outline-none ylc-theme-focus-ring'
        onClick={() => setDisplay(current => !current)}
      >
        <div className='ylc-theme-alpha-checker rounded-[6px] w-full h-full'>
          <div
            className='ylc-action-fill h-full rounded-[5px]'
            style={{
              backgroundColor: `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`,
              border: `var(--ylc-border-width) solid ${previewBorderColor}`,
            }}
          />
        </div>
      </button>
      {display ? (
        <div ref={menuRef} className='absolute right-0 z-50' role='dialog' aria-label={t('content.aria.colorPicker')}>
          <RgbaColorPicker color={toRgba(rgba)} onChange={onChange} />
        </div>
      ) : null}
    </div>
  )
}
