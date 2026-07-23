import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatHistoryStore, useYTDLiveChatStore } from '@/shared/stores'
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
    useYTDLiveChatHistoryStore.getState().clear()
  })

  it('uses the matching store value for the slider label and aria value', () => {
    useYTDLiveChatStore.setState({ fontSize: 25 })

    const { getByRole } = render(<YLCNumberSlider settingKey='fontSize' labelKey='content.setting.fontSize' min={10} max={40} />)

    const slider = getByRole('slider', { name: 'content.setting.fontSize' })
    expect(slider.getAttribute('aria-valuetext')).toBe('25px')
    expect((slider as HTMLInputElement).value).toBe('25')
  })

  it('updates only the selected numeric setting and records a drag as one history entry', () => {
    useYTDLiveChatStore.setState({ fontSize: 12, blur: 4, space: 8 })

    const { getByRole } = render(<YLCNumberSlider settingKey='fontSize' labelKey='content.setting.fontSize' min={10} max={40} />)

    const slider = getByRole('slider', { name: 'content.setting.fontSize' })
    const setPointerCapture = vi.fn()
    Object.defineProperty(slider, 'setPointerCapture', { configurable: true, value: setPointerCapture })
    fireEvent.pointerDown(slider)
    fireEvent.change(slider, { target: { value: '20' } })
    fireEvent.change(slider, { target: { value: '25' } })
    fireEvent.pointerUp(slider)

    expect(useYTDLiveChatStore.getState().fontSize).toBe(25)
    expect(useYTDLiveChatStore.getState().blur).toBe(4)
    expect(useYTDLiveChatStore.getState().space).toBe(8)
    expect(useYTDLiveChatHistoryStore.getState().past).toHaveLength(1)
    expect(setPointerCapture).toHaveBeenCalled()
  })

  it('uses the provided range when updating space', () => {
    useYTDLiveChatStore.setState({ blur: 2, space: 16 })

    const { getByRole } = render(<YLCNumberSlider settingKey='space' labelKey='content.setting.space' min={0} max={40} />)

    fireEvent.change(getByRole('slider', { name: 'content.setting.space' }), { target: { value: '24' } })

    expect(useYTDLiveChatStore.getState().blur).toBe(2)
    expect(useYTDLiveChatStore.getState().space).toBe(24)
  })
})
