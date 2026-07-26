import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatEditorStore } from '@/entrypoints/content/settings/ChatEditorStore'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
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

const resetStore = () => {
  useChatSettingsStore.setState(DEFAULT_CHAT_SETTINGS)
}

describe('YLCNumberSlider', () => {
  beforeEach(() => {
    resetStore()
    useChatEditorStore.getState().clear()
  })

  it('uses the matching store value for the slider label and aria value', () => {
    const profile = useChatSettingsStore.getState().profile
    useChatSettingsStore.setState({
      profile: { ...profile, appearance: { ...profile.appearance, fontSize: 25 } },
    })

    const { getByRole } = render(<YLCNumberSlider settingKey='fontSize' labelKey='content.setting.fontSize' min={10} max={40} />)

    const slider = getByRole('slider', { name: 'content.setting.fontSize' })
    expect(slider.getAttribute('aria-valuetext')).toBe('25px')
    expect((slider as HTMLInputElement).value).toBe('25')
  })

  it('updates only the selected numeric setting and records a drag as one history entry', () => {
    const profile = useChatSettingsStore.getState().profile
    useChatSettingsStore.setState({
      profile: {
        ...profile,
        appearance: { ...profile.appearance, fontSize: 12, blur: 4, spacing: 8 },
      },
    })

    const { getByRole } = render(<YLCNumberSlider settingKey='fontSize' labelKey='content.setting.fontSize' min={10} max={40} />)

    const slider = getByRole('slider', { name: 'content.setting.fontSize' })
    const setPointerCapture = vi.fn()
    Object.defineProperty(slider, 'setPointerCapture', { configurable: true, value: setPointerCapture })
    fireEvent.pointerDown(slider)
    fireEvent.change(slider, { target: { value: '20' } })
    fireEvent.change(slider, { target: { value: '25' } })
    fireEvent.pointerUp(slider)

    expect(useChatSettingsStore.getState().profile.appearance.fontSize).toBe(25)
    expect(useChatSettingsStore.getState().profile.appearance.blur).toBe(4)
    expect(useChatSettingsStore.getState().profile.appearance.spacing).toBe(8)
    expect(useChatEditorStore.getState().past).toHaveLength(1)
    expect(setPointerCapture).toHaveBeenCalled()
  })

  it('uses the provided range when updating space', () => {
    const profile = useChatSettingsStore.getState().profile
    useChatSettingsStore.setState({
      profile: {
        ...profile,
        appearance: { ...profile.appearance, blur: 2, spacing: 16 },
      },
    })

    const { getByRole } = render(<YLCNumberSlider settingKey='spacing' labelKey='content.setting.space' min={0} max={40} />)

    const slider = getByRole('slider', { name: 'content.setting.space' })
    fireEvent.pointerDown(slider)
    fireEvent.change(slider, { target: { value: '24' } })
    fireEvent.pointerUp(slider)

    expect(useChatSettingsStore.getState().profile.appearance.blur).toBe(2)
    expect(useChatSettingsStore.getState().profile.appearance.spacing).toBe(24)
  })
})
