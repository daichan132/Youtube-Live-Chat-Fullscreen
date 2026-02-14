import React, { useCallback, useRef } from 'react'

import { useShallow } from 'zustand/react/shallow'

import { useYLCSpaceChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCSpaceChange'
import { useYTDLiveChatStore } from '@/shared/stores'
import { SettingSliderUI, useSettingSlider } from './SettingSlider'

const minSize = 0
const maxSize = 40

export const spaceToSliderValue = (space: number) => {
  return ((space - minSize) * 100) / ((maxSize - minSize) * 100)
}

const sliderValueToSpace = (value: number) => {
  return Math.round((value * ((maxSize - minSize) * 100)) / 100 + minSize)
}

export const SpaceSlider = () => {
  const spaceRef = useRef(useYTDLiveChatStore.getState().space)
  const { updateYLCStyle } = useYTDLiveChatStore(useShallow(state => ({ updateYLCStyle: state.updateYLCStyle })))
  const { changeSpace } = useYLCSpaceChange()
  const updateSpace = useCallback(
    (space: number) => {
      updateYLCStyle({ space })
      changeSpace(space)
    },
    [changeSpace, updateYLCStyle],
  )

  const { value, ref } = useSettingSlider<HTMLDivElement>({
    initialValue: spaceRef.current,
    toSliderValue: spaceToSliderValue,
    fromSliderValue: sliderValueToSpace,
    onChange: updateSpace,
  })

  return <SpaceSliderUI value={value} ref={ref} />
}

export const SpaceSliderUI = React.forwardRef<HTMLDivElement, { value: number }>(({ value }, ref) => {
  const space = sliderValueToSpace(value)
  return <SettingSliderUI value={value} ref={ref} aria-label='Space' aria-valuetext={`${Math.round(space)}px`} />
})

SpaceSliderUI.displayName = 'SpaceSlider'
