import { fireEvent, type RenderResult } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom, editorSessionStateAtom } from '@/shared/state/atoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { YLCColorPicker } from './YLCColorPicker'

const openAlphaSlider = (getByRole: RenderResult['getByRole'], label: string) => {
  fireEvent.click(getByRole('button', { name: label }))
  const slider = getByRole('slider', { name: 'Alpha' })
  vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
    bottom: 100,
    height: 100,
    left: 0,
    right: 200,
    top: 0,
    width: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  return slider
}

const store = createTestStore()
const resetStore = () => store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)

describe('YLCColorPicker', () => {
  beforeEach(() => {
    resetStore()
    store.set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null })
  })

  it('previews a color drag and saves it once when released outside the picker', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(chatSettingsStateAtom, {
      ...store.get(chatSettingsStateAtom),
      profile: {
        ...profile,
        appearance: { ...profile.appearance, backgroundColor: { r: 0, g: 0, b: 0, a: 0.4 } },
      },
    })

    const { getByRole } = renderWithStore(<YLCColorPicker settingKey='backgroundColor' labelKey='content.setting.backgroundColor' />, store)
    const button = getByRole('button', { name: 'content.setting.backgroundColor' })

    expect(button).toHaveAccessibleDescription('rgba(0, 0, 0, 0.4)')
    const slider = openAlphaSlider(getByRole, 'content.setting.backgroundColor')

    fireEvent.mouseDown(slider, { buttons: 1, clientX: 40, clientY: 50 })
    expect(store.get(editorSessionStateAtom).draftProfile?.appearance.backgroundColor.a).toBe(0.2)
    fireEvent.mouseMove(window, { buttons: 1, clientX: 150, clientY: 50 })

    expect(button).toHaveAccessibleDescription('rgba(0, 0, 0, 0.75)')
    expect(store.get(editorSessionStateAtom).draftProfile?.appearance.backgroundColor).toEqual({ r: 0, g: 0, b: 0, a: 0.75 })
    expect(store.get(chatSettingsStateAtom).profile.appearance.backgroundColor).toEqual({ r: 0, g: 0, b: 0, a: 0.4 })
    expect(store.get(editorSessionStateAtom).past).toHaveLength(0)

    fireEvent.mouseUp(window)

    expect(store.get(chatSettingsStateAtom).profile.appearance.backgroundColor).toEqual({ r: 0, g: 0, b: 0, a: 0.75 })
    expect(store.get(editorSessionStateAtom).draftProfile).toBeNull()
    expect(store.get(editorSessionStateAtom).past).toHaveLength(1)
  })

  it('updates the font color setting without changing the background color setting', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(chatSettingsStateAtom, {
      ...store.get(chatSettingsStateAtom),
      profile: {
        ...profile,
        appearance: {
          ...profile.appearance,
          backgroundColor: { r: 1, g: 2, b: 3, a: 0.4 },
          fontColor: { r: 4, g: 5, b: 6, a: 0.7 },
        },
      },
    })

    const { getByRole } = renderWithStore(<YLCColorPicker settingKey='fontColor' labelKey='content.setting.fontColor' />, store)
    expect(getByRole('button', { name: 'content.setting.fontColor' })).toHaveAccessibleDescription('rgba(4, 5, 6, 0.7)')

    const slider = openAlphaSlider(getByRole, 'content.setting.fontColor')
    fireEvent.mouseDown(slider, { buttons: 1, clientX: 150, clientY: 50 })
    fireEvent.mouseUp(window)

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontColor).toEqual({ r: 4, g: 5, b: 6, a: 0.75 })
    expect(store.get(chatSettingsStateAtom).profile.appearance.backgroundColor).toEqual({ r: 1, g: 2, b: 3, a: 0.4 })
  })

  it('updates the membership name color setting', () => {
    const { getByRole } = renderWithStore(
      <YLCColorPicker settingKey='membershipNameColor' labelKey='content.setting.membershipNameColor' />,
      store,
    )
    expect(getByRole('button', { name: 'content.setting.membershipNameColor' })).toHaveAccessibleDescription('rgba(15, 157, 88, 1)')

    const slider = openAlphaSlider(getByRole, 'content.setting.membershipNameColor')
    fireEvent.mouseDown(slider, { buttons: 1, clientX: 150, clientY: 50 })
    fireEvent.mouseUp(window)

    expect(store.get(chatSettingsStateAtom).profile.appearance.membershipNameColor).toEqual({
      mode: 'custom',
      value: { r: 15, g: 157, b: 88, a: 0.75 },
    })
  })
})
