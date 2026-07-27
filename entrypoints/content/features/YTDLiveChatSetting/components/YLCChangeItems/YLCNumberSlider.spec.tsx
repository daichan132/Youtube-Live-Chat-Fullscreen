import { fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom, editorSessionStateAtom } from '@/shared/state/atoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { YLCNumberSlider } from './YLCNumberSlider'

const store = createTestStore()
const resetStore = () => store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)

describe('YLCNumberSlider', () => {
  beforeEach(() => {
    resetStore()
    store.set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null })
  })

  it('uses the matching store value for the slider label and aria value', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(chatSettingsStateAtom, {
      ...store.get(chatSettingsStateAtom),
      profile: { ...profile, appearance: { ...profile.appearance, fontSize: 25 } },
    })

    const { getByRole } = renderWithStore(
      <YLCNumberSlider settingKey='fontSize' labelKey='content.setting.fontSize' min={10} max={40} />,
      store,
    )

    const slider = getByRole('slider', { name: 'content.setting.fontSize' })
    expect(slider.getAttribute('aria-valuetext')).toBe('25px')
    expect((slider as HTMLInputElement).value).toBe('25')
  })

  it('updates only the selected numeric setting and records a drag as one history entry', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(chatSettingsStateAtom, {
      ...store.get(chatSettingsStateAtom),
      profile: {
        ...profile,
        appearance: { ...profile.appearance, fontSize: 12, blur: 4, spacing: 8 },
      },
    })

    const { getByRole } = renderWithStore(
      <YLCNumberSlider settingKey='fontSize' labelKey='content.setting.fontSize' min={10} max={40} />,
      store,
    )

    const slider = getByRole('slider', { name: 'content.setting.fontSize' })
    const setPointerCapture = vi.fn()
    Object.defineProperty(slider, 'setPointerCapture', { configurable: true, value: setPointerCapture })
    fireEvent.pointerDown(slider)
    fireEvent.change(slider, { target: { value: '20' } })
    fireEvent.change(slider, { target: { value: '25' } })
    fireEvent.pointerUp(slider)

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(25)
    expect(store.get(chatSettingsStateAtom).profile.appearance.blur).toBe(4)
    expect(store.get(chatSettingsStateAtom).profile.appearance.spacing).toBe(8)
    expect(store.get(editorSessionStateAtom).past).toHaveLength(1)
    expect(setPointerCapture).toHaveBeenCalled()
  })

  it('uses the provided range when updating space', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(chatSettingsStateAtom, {
      ...store.get(chatSettingsStateAtom),
      profile: {
        ...profile,
        appearance: { ...profile.appearance, blur: 2, spacing: 16 },
      },
    })

    const { getByRole } = renderWithStore(<YLCNumberSlider settingKey='spacing' labelKey='content.setting.space' min={0} max={40} />, store)

    const slider = getByRole('slider', { name: 'content.setting.space' })
    fireEvent.pointerDown(slider)
    fireEvent.change(slider, { target: { value: '24' } })
    fireEvent.pointerUp(slider)

    expect(store.get(chatSettingsStateAtom).profile.appearance.blur).toBe(2)
    expect(store.get(chatSettingsStateAtom).profile.appearance.spacing).toBe(24)
  })
})
