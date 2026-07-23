import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatHistoryStore, useYTDLiveChatStore } from '@/shared/stores'
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
    onInteractionStart,
    onInteractionEnd,
  }: {
    rgba: { r: number; g: number; b: number; a?: number }
    label: string
    onChange: (color: { r: number; g: number; b: number; a: number }) => void
    onInteractionStart?: () => void
    onInteractionEnd?: () => void
  }) => (
    <button
      type='button'
      aria-label={label}
      data-rgba={`${rgba.r},${rgba.g},${rgba.b},${rgba.a}`}
      onClick={() => {
        onInteractionStart?.()
        onChange({ r: 9, g: 8, b: 7, a: 0.6 })
        onInteractionEnd?.()
      }}
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
    useYTDLiveChatHistoryStore.getState().clear()
  })

  it('updates the background color setting and records one history entry', () => {
    useYTDLiveChatStore.setState({ bgColor: { r: 1, g: 2, b: 3, a: 0.4 } })

    const { getByRole } = render(<YLCColorPicker settingKey='bgColor' labelKey='content.setting.backgroundColor' />)
    const button = getByRole('button', { name: 'content.setting.backgroundColor' })

    expect(button.getAttribute('data-rgba')).toBe('1,2,3,0.4')

    fireEvent.click(button)

    expect(useYTDLiveChatStore.getState().bgColor).toEqual({ r: 9, g: 8, b: 7, a: 0.6 })
    expect(useYTDLiveChatHistoryStore.getState().past).toHaveLength(1)
  })

  it('updates the font color setting without changing the background color setting', () => {
    useYTDLiveChatStore.setState({
      bgColor: { r: 1, g: 2, b: 3, a: 0.4 },
      fontColor: { r: 4, g: 5, b: 6, a: 0.7 },
    })

    const { getByRole } = render(<YLCColorPicker settingKey='fontColor' labelKey='content.setting.fontColor' />)
    const button = getByRole('button', { name: 'content.setting.fontColor' })

    expect(button.getAttribute('data-rgba')).toBe('4,5,6,0.7')

    fireEvent.click(button)

    expect(useYTDLiveChatStore.getState().fontColor).toEqual({ r: 9, g: 8, b: 7, a: 0.6 })
    expect(useYTDLiveChatStore.getState().bgColor).toEqual({ r: 1, g: 2, b: 3, a: 0.4 })
  })

  it('updates the membership name color setting', () => {
    useYTDLiveChatStore.setState({ membershipNameColor: { r: 15, g: 157, b: 88, a: 1 } })

    const { getByRole } = render(<YLCColorPicker settingKey='membershipNameColor' labelKey='content.setting.membershipNameColor' />)
    const button = getByRole('button', { name: 'content.setting.membershipNameColor' })

    expect(button.getAttribute('data-rgba')).toBe('15,157,88,1')

    fireEvent.click(button)

    expect(useYTDLiveChatStore.getState().membershipNameColor).toEqual({ r: 9, g: 8, b: 7, a: 0.6 })
  })
})
