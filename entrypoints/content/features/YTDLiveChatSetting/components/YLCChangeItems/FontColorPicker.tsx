import type { Dispatch, SetStateAction } from 'react'
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { RgbaColor } from 'react-colorful'

const RgbaColorPickerLazy = lazy(() => import('react-colorful').then(mod => ({ default: mod.RgbaColorPicker })))

import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { useYLCFontColorChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCFontColorChange'

import { useShadowClickAway } from '@/shared/hooks/useShadowClickAway'
import { useYTDLiveChatStore } from '@/shared/stores'
import type { RGBColor } from '@/shared/types/ytdLiveChatType'
import { useEnsureSettingPanelVisibility } from './useEnsureSettingPanelVisibility'

const toRgba = (c: RGBColor): RgbaColor => ({ r: c.r, g: c.g, b: c.b, a: c.a ?? 1 })
const fromRgba = (c: RgbaColor): RGBColor => ({ r: c.r, g: c.g, b: c.b, a: c.a })

const getPreviewBorderColor = (rgba: RGBColor) => {
  const alpha = typeof rgba.a === 'number' ? rgba.a : 1
  const luminance = (0.2126 * rgba.r + 0.7152 * rgba.g + 0.0722 * rgba.b) / 255

  if (alpha < 0.35) {
    return 'var(--ylc-preview-border-muted)'
  }

  return luminance > 0.82 ? 'var(--ylc-preview-border-strong)' : 'var(--ylc-preview-border-soft)'
}

export const FontColorPicker = () => {
  const { changeColor } = useYLCFontColorChange()
  const stateRef = useRef(useYTDLiveChatStore.getState())
  const [rgba, setRgba] = useState<RGBColor>(stateRef.current.fontColor)
  const { updateYLCStyle } = useYTDLiveChatStore(useShallow(state => ({ updateYLCStyle: state.updateYLCStyle })))
  const [display, setDisplay] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useEnsureSettingPanelVisibility({ isOpen: display, anchorRef: triggerRef, popupRef: menuRef })
  useShadowClickAway(ref, () => {
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

  const onChange = useCallback(
    (c: RgbaColor) => {
      const rgb = fromRgba(c)
      changeColor(rgb)
      updateYLCStyle({ fontColor: rgb })
      setRgba(rgb)
    },
    [changeColor, updateYLCStyle],
  )
  return (
    <FontColorPickerUI
      rgba={rgba}
      ref={ref}
      triggerRef={triggerRef}
      menuRef={menuRef}
      display={display}
      setDisplay={setDisplay}
      onChange={onChange}
    />
  )
}

export const FontColorPickerUI = React.forwardRef<
  HTMLDivElement,
  {
    rgba: RGBColor
    triggerRef?: React.RefObject<HTMLButtonElement | null>
    menuRef?: React.RefObject<HTMLDivElement | null>
    display?: boolean
    setDisplay?: Dispatch<SetStateAction<boolean>>
    onChange?: (c: RgbaColor) => void
  }
>(({ rgba, triggerRef, menuRef, display, setDisplay, onChange }, ref) => {
  const { t } = useTranslation()
  const previewBorderColor = getPreviewBorderColor(rgba)

  return (
    <div ref={ref} className='relative ylc-action-fill'>
      <span
        id='ylc-font-color-desc'
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
        aria-label={t('content.setting.fontColor')}
        aria-describedby='ylc-font-color-desc'
        aria-haspopup='dialog'
        aria-expanded={display ?? false}
        className='ylc-action-fill block h-[36px] p-[6px] ylc-theme-surface rounded-[10px] cursor-pointer relative border border-solid ylc-theme-border outline-none ylc-theme-focus-ring'
        onClick={() => setDisplay?.(d => !d)}
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
      <div ref={menuRef} className='absolute right-0 z-50' role='dialog' aria-label={t('content.aria.colorPicker')}>
        {display ? (
          <Suspense fallback={<div style={{ width: 200, height: 200 }} />}>
            <RgbaColorPickerLazy color={toRgba(rgba)} onChange={onChange} />
          </Suspense>
        ) : null}
      </div>
    </div>
  )
})
