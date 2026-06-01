import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatStore } from '@/shared/stores'
import { YLCColorPicker } from './YLCColorPicker'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

vi.mock('./SettingColorPicker', () => ({
  SettingColorPicker: ({
    rgba,
    label,
    onChange,
  }: {
    rgba: { r: number; g: number; b: number; a?: number }
    label: string
    onChange: (color: { r: number; g: number; b: number; a: number }) => void
  }) => (
    <button
      type='button'
      aria-label={label}
      data-rgba={`${rgba.r},${rgba.g},${rgba.b},${rgba.a}`}
      onClick={() => onChange({ r: 9, g: 8, b: 7, a: 0.6 })}
    >
      {label}
    </button>
  ),
}))

const baseState = useYTDLiveChatStore.getState()

const resetStore = () => {
  useYTDLiveChatStore.setState(
    {
      ...baseState,
      coordinates: { ...baseState.coordinates },
      size: { ...baseState.size },
      presetItemIds: [...baseState.presetItemIds],
      presetItemStyles: { ...baseState.presetItemStyles },
      presetItemTitles: { ...baseState.presetItemTitles },
    },
    true,
  )
}

describe('YLCColorPicker', () => {
  beforeEach(() => {
    resetStore()
  })

  it('updates the background color setting and applies the style color', () => {
    const applyColor = vi.fn()
    useYTDLiveChatStore.setState({ bgColor: { r: 1, g: 2, b: 3, a: 0.4 } })

    const { getByRole } = render(<YLCColorPicker settingKey='bgColor' labelKey='content.setting.backgroundColor' applyColor={applyColor} />)
    const button = getByRole('button', { name: 'content.setting.backgroundColor' })

    expect(button.getAttribute('data-rgba')).toBe('1,2,3,0.4')

    fireEvent.click(button)

    expect(applyColor).toHaveBeenCalledWith({ r: 9, g: 8, b: 7, a: 0.6 })
    expect(useYTDLiveChatStore.getState().bgColor).toEqual({ r: 9, g: 8, b: 7, a: 0.6 })
  })

  it('updates the font color setting without changing the background color setting', () => {
    const applyColor = vi.fn()
    useYTDLiveChatStore.setState({
      bgColor: { r: 1, g: 2, b: 3, a: 0.4 },
      fontColor: { r: 4, g: 5, b: 6, a: 0.7 },
    })

    const { getByRole } = render(<YLCColorPicker settingKey='fontColor' labelKey='content.setting.fontColor' applyColor={applyColor} />)
    const button = getByRole('button', { name: 'content.setting.fontColor' })

    expect(button.getAttribute('data-rgba')).toBe('4,5,6,0.7')

    fireEvent.click(button)

    expect(applyColor).toHaveBeenCalledWith({ r: 9, g: 8, b: 7, a: 0.6 })
    expect(useYTDLiveChatStore.getState().fontColor).toEqual({ r: 9, g: 8, b: 7, a: 0.6 })
    expect(useYTDLiveChatStore.getState().bgColor).toEqual({ r: 1, g: 2, b: 3, a: 0.4 })
  })
})
