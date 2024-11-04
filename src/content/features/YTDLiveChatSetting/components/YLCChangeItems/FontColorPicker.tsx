import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useRef, useState } from 'react'
import React from 'react'

import { ChromePicker } from 'react-color'
import { useClickAway } from 'react-use'
import { useShallow } from 'zustand/react/shallow'

import { useYLCFontColorChange } from '@/content/hooks/ylcStyleChange/useYLCFontColorChange'
import { useYTDLiveChatStore } from '@/shared/stores'
import styles from '../../styles/CustomColorPicker.module.css'

import type { ColorResult, RGBColor } from 'react-color'

export const FontColorPicker = () => {
  const { changeColor } = useYLCFontColorChange()
  const stateRef = useRef(useYTDLiveChatStore.getState())
  const [rgba, setRgba] = useState<RGBColor>(stateRef.current.fontColor)
  const { updateYLCStyle } = useYTDLiveChatStore(
    useShallow(state => ({ updateYLCStyle: state.updateYLCStyle })),
  )
  const [display, setDisplay] = useState(false)
  const ref = useRef(null)
  useClickAway(ref, () => {
    setDisplay(false)
  })
  const onChange = useCallback(
    (c: ColorResult) => {
      changeColor(c.rgb)
      updateYLCStyle({ fontColor: c.rgb })
      setRgba(c.rgb)
    },
    [changeColor, updateYLCStyle],
  )
  return (
    <FontColorPickerUI
      rgba={rgba}
      ref={ref}
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
    display?: boolean
    setDisplay?: Dispatch<SetStateAction<boolean>>
    onChange?: (c: ColorResult) => void
  }
>(({ rgba, display, setDisplay, onChange }, ref) => {
  return (
    <div className={styles['color-picker-wrapper']} ref={ref}>
      <div
        className={styles['color-display']}
        onClick={() => setDisplay?.(d => !d)}
        onKeyUp={() => { }}
      >
        <div className={styles['color-preview-background']}>
          <div
            className={styles['color-preview']}
            style={{
              backgroundColor: `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`,
            }}
          />
        </div>
      </div>
      <div className={styles['color-picker']}>
        {display ? (
          <ChromePicker
            color={rgba}
            onChange={onChange}
            styles={{
              default: {
                picker: {
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: 5,
                  overflow: 'hidden',
                },
              },
            }}
          />
        ) : null}
      </div>
    </div>
  )
})

FontColorPickerUI.displayName = 'FontColorPickerUI'
