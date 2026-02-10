import type { Dispatch, SetStateAction } from 'react'
import React, { useCallback, useRef, useState } from 'react'
import type { ColorResult, RGBColor } from 'react-color'
import { ChromePicker } from 'react-color'
import { useShallow } from 'zustand/react/shallow'
import { useYLCFontColorChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCFontColorChange'

import { useShadowClickAway } from '@/shared/hooks/useShadowClickAway'
import { useYTDLiveChatStore } from '@/shared/stores'

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
  useShadowClickAway(ref, () => setDisplay(false))
  const onChange = useCallback(
    (c: ColorResult) => {
      changeColor(c.rgb)
      updateYLCStyle({ fontColor: c.rgb })
      setRgba(c.rgb)
    },
    [changeColor, updateYLCStyle],
  )
  return <FontColorPickerUI rgba={rgba} ref={ref} display={display} setDisplay={setDisplay} onChange={onChange} />
}

export const FontColorPickerUI = React.forwardRef<
  HTMLDivElement,
  {
    rgba: RGBColor
    display?: boolean
    setDisplay?: Dispatch<SetStateAction<boolean>>
    onChange?: (c: ColorResult) => void
  }
>(({ rgba, display, setDisplay, onChange }, ref) => {
  const previewBorderColor = getPreviewBorderColor(rgba)

  return (
    <div ref={ref} className='relative ylc-action-fill'>
      <button
        type='button'
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
      <div className='absolute right-0 z-1'>
        {display ? (
          <ChromePicker
            color={rgba}
            onChange={onChange}
            styles={{
              default: {
                picker: {
                  border: 'var(--ylc-border-width) solid var(--ylc-border)',
                  borderRadius: 5,
                  overflow: 'hidden',
                  boxShadow: 'none',
                },
              },
            }}
          />
        ) : null}
      </div>
    </div>
  )
})
