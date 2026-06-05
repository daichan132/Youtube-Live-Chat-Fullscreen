import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatStore } from '@/shared/stores'
import { YLCNumberSlider } from './YLCNumberSlider'

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

describe('YLCNumberSlider', () => {
  beforeEach(() => {
    resetStore()
  })

  it('uses the matching store value for the slider label and aria value', () => {
    useYTDLiveChatStore.setState({ fontSize: 25 })

    const { getByRole } = render(
      <YLCNumberSlider settingKey='fontSize' labelKey='content.setting.fontSize' min={10} max={40} applyValue={vi.fn()} />,
    )

    const slider = getByRole('slider', { name: 'content.setting.fontSize' })
    expect(slider.getAttribute('aria-valuetext')).toBe('25px')
    expect((slider as HTMLInputElement).value).toBe('25')
  })

  it('updates only the selected numeric setting and applies the changed value', () => {
    const applyValue = vi.fn()
    useYTDLiveChatStore.setState({ fontSize: 12, blur: 4, space: 8 })

    const { getByRole } = render(
      <YLCNumberSlider settingKey='fontSize' labelKey='content.setting.fontSize' min={10} max={40} applyValue={applyValue} />,
    )

    fireEvent.change(getByRole('slider', { name: 'content.setting.fontSize' }), { target: { value: '25' } })

    expect(applyValue).toHaveBeenCalledWith(25)
    expect(useYTDLiveChatStore.getState().fontSize).toBe(25)
    expect(useYTDLiveChatStore.getState().blur).toBe(4)
    expect(useYTDLiveChatStore.getState().space).toBe(8)
  })

  it('uses the provided range when updating blur', () => {
    const applyValue = vi.fn()
    useYTDLiveChatStore.setState({ blur: 2, space: 16 })

    const { getByRole } = render(
      <YLCNumberSlider settingKey='blur' labelKey='content.setting.blur' min={0} max={20} applyValue={applyValue} />,
    )

    fireEvent.change(getByRole('slider', { name: 'content.setting.blur' }), { target: { value: '15' } })

    expect(applyValue).toHaveBeenCalledWith(15)
    expect(useYTDLiveChatStore.getState().blur).toBe(15)
    expect(useYTDLiveChatStore.getState().space).toBe(16)
  })
})
