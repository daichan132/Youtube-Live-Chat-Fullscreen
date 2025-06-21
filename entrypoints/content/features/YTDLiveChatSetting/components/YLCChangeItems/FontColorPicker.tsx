import type { Dispatch, SetStateAction } from 'react'
import React, { useCallback, useRef, useState } from 'react'
import type { ColorResult, RGBColor } from 'react-color'
import { ChromePicker } from 'react-color'
import { useShallow } from 'zustand/react/shallow'
import { useYLCFontColorChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCFontColorChange'

import { useShadowClickAway } from '@/shared/hooks/useShadowClickAway'
import { useYTDLiveChatStore } from '@/shared/stores'

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
  return (
    <div ref={ref} className='relative'>
      <button
        type='button'
        className='inline-block p-[5px] bg-white rounded-[1px] shadow-[0_0_0_1px_rgba(0,0,0,0.1)] cursor-pointer relative'
        onClick={() => setDisplay?.(d => !d)}
      >
        <div className='bg-[linear-gradient(45deg,#dddddd_25%,transparent_25%,transparent_75%,#dddddd_75%),linear-gradient(45deg,#dddddd_25%,transparent_25%,transparent_75%,#dddddd_75%)] bg-[position:0_0,5px_5px] bg-[length:10px_10px] bg-white rounded-[2px] w-full h-full'>
          <div
            className='w-[150px] h-[16px] rounded-[2px]'
            style={{
              backgroundColor: `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`,
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
