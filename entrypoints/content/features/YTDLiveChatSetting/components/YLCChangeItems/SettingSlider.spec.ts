import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const sliderState = vi.hoisted(() => ({
  sliderValue: 0,
  lastOptions: null as null | { onScrub?: (value: number) => void },
}))

vi.mock('./useSlider', () => ({
  useSlider: (_ref: unknown, options: { onScrub?: (value: number) => void }) => {
    sliderState.lastOptions = options
    return { value: sliderState.sliderValue, isSliding: false }
  },
}))

import { createIntegerRangeSliderScale, useSettingSlider } from './SettingSlider'

describe('createIntegerRangeSliderScale', () => {
  it('converts integer ranges to slider values and back', () => {
    const scale = createIntegerRangeSliderScale(10, 40)

    expect(scale.toSliderValue(10)).toBe(0)
    expect(scale.toSliderValue(25)).toBe(0.5)
    expect(scale.toSliderValue(40)).toBe(1)
    expect(scale.fromSliderValue(0)).toBe(10)
    expect(scale.fromSliderValue(0.5)).toBe(25)
    expect(scale.fromSliderValue(1)).toBe(40)
  })

  it('rounds partial slider values to the nearest integer', () => {
    const scale = createIntegerRangeSliderScale(0, 20)

    expect(scale.fromSliderValue(0.26)).toBe(5)
  })
})

describe('useSettingSlider', () => {
  const scale = createIntegerRangeSliderScale(0, 10)

  beforeEach(() => {
    sliderState.sliderValue = 0
    sliderState.lastOptions = null
  })

  it('returns the scaled initial value until the first scrub', () => {
    sliderState.sliderValue = 0.2
    const onChange = vi.fn()
    const { result, rerender } = renderHook(
      ({ initialValue }) =>
        useSettingSlider({
          initialValue,
          toSliderValue: scale.toSliderValue,
          fromSliderValue: scale.fromSliderValue,
          onChange,
        }),
      {
        initialProps: { initialValue: 7 },
      },
    )

    expect(result.current.value).toBe(0.7)

    act(() => {
      sliderState.lastOptions?.onScrub?.(0.2)
    })

    rerender({ initialValue: 7 })

    expect(onChange).toHaveBeenCalledWith(2)
    expect(result.current.value).toBe(0.2)
  })

  it('uses a changed initial value as the new source value after interaction', () => {
    sliderState.sliderValue = 0.2
    const { result, rerender } = renderHook(
      ({ initialValue }) =>
        useSettingSlider({
          initialValue,
          toSliderValue: scale.toSliderValue,
          fromSliderValue: scale.fromSliderValue,
          onChange: vi.fn(),
        }),
      {
        initialProps: { initialValue: 7 },
      },
    )

    act(() => {
      sliderState.lastOptions?.onScrub?.(0.2)
    })

    rerender({ initialValue: 7 })
    expect(result.current.value).toBe(0.2)

    rerender({ initialValue: 9 })
    expect(result.current.value).toBe(0.9)
  })

  it('handles scrubbing after the initial value changes', () => {
    sliderState.sliderValue = 0.2
    const onChange = vi.fn()
    const { rerender } = renderHook(
      ({ initialValue }) =>
        useSettingSlider({
          initialValue,
          toSliderValue: scale.toSliderValue,
          fromSliderValue: scale.fromSliderValue,
          onChange,
        }),
      {
        initialProps: { initialValue: 7 },
      },
    )

    act(() => {
      sliderState.lastOptions?.onScrub?.(0.2)
    })
    rerender({ initialValue: 9 })

    act(() => {
      sliderState.lastOptions?.onScrub?.(0.4)
    })

    expect(onChange).toHaveBeenLastCalledWith(4)
  })
})
