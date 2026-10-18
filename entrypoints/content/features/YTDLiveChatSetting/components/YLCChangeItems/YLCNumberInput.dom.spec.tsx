import { act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chatSettingsStateAtom, editorSessionStateAtom, replaceExternalAppearanceAtom } from '@/shared/state/atoms'
import { undoStyleAtom } from '@/shared/state/commands'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { type NumberSliderSettingKey, YLCNumberSlider } from './YLCNumberSlider'

let store = createTestStore()
const renderNumber = () =>
  renderWithStore(<YLCNumberSlider settingKey='fontSize' labelKey='content.setting.fontSize' min={10} max={40} />, store)

beforeEach(() => {
  store = createTestStore()
})

describe('direct numeric settings input', () => {
  it.each([
    { settingKey: 'fontSize', min: 10, max: 40, value: 13 },
    { settingKey: 'blur', min: 0, max: 20, value: 0 },
    { settingKey: 'spacing', min: 0, max: 40, value: 0 },
  ] satisfies { settingKey: NumberSliderSettingKey; min: number; max: number; value: number }[])(
    'keeps a numeric input beside the existing $settingKey range',
    ({ settingKey, min, max, value }) => {
      const view = renderWithStore(
        <YLCNumberSlider settingKey={settingKey} labelKey='content.setting.fontSize' min={min} max={max} />,
        store,
      )
      expect(view.getByRole('spinbutton')).toHaveValue(value)
      expect(view.getByRole('spinbutton')).toHaveAttribute('min', String(min))
      expect(view.getByRole('spinbutton')).toHaveAttribute('max', String(max))
      expect(view.getByRole('slider')).toHaveValue(String(value))
    },
  )

  it('keeps typing local and commits Enter plus blur as one undoable change', async () => {
    const user = userEvent.setup()
    const view = renderNumber()
    const number = view.getByRole('spinbutton')
    const committed = vi.fn()
    const unsubscribe = store.sub(chatSettingsStateAtom, committed)
    try {
      await user.clear(number)
      await user.type(number, '24')
      expect(number).toHaveValue(24)
      expect(view.getByRole('slider')).toHaveValue('13')
      expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(13)
      expect(store.get(editorSessionStateAtom).draftProfile).toBeNull()
      expect(committed).not.toHaveBeenCalled()

      await user.keyboard('{Enter}')
      await user.tab()

      expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(24)
      expect(view.getByRole('slider')).toHaveValue('24')
      expect(store.get(editorSessionStateAtom).past).toHaveLength(1)
      expect(committed).toHaveBeenCalledOnce()
      act(() => store.set(undoStyleAtom))
      expect(number).toHaveValue(13)
      expect(view.getByRole('slider')).toHaveValue('13')
    } finally {
      unsubscribe()
    }
  })

  it.each([
    { text: '-8', expected: 10, entries: 1 },
    { text: '999', expected: 40, entries: 1 },
    { text: '', expected: 13, entries: 0 },
    { text: '12.5', expected: 13, entries: 0 },
    { text: '1e309', expected: 13, entries: 0 },
  ])('finishes "$text" on blur without saving invalid values', ({ text, expected, entries }) => {
    const view = renderNumber()
    const number = view.getByRole('spinbutton')
    fireEvent.focus(number)
    fireEvent.change(number, { target: { value: text } })
    fireEvent.blur(number)

    expect(number).toHaveValue(expected)
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(expected)
    expect(store.get(editorSessionStateAtom).past).toHaveLength(entries)
  })

  it('cancels Escape locally and keeps focus in the field', async () => {
    const user = userEvent.setup()
    const outerEscape = vi.fn()
    const view = renderNumber()
    document.addEventListener('keydown', outerEscape)
    const number = view.getByRole('spinbutton')
    await user.clear(number)
    await user.type(number, '31')
    outerEscape.mockClear()

    try {
      await user.keyboard('{Escape}')

      expect(number).toHaveFocus()
      expect(number).toHaveValue(13)
      expect(outerEscape).not.toHaveBeenCalled()
      expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(13)
      expect(store.get(editorSessionStateAtom).past).toHaveLength(0)
      fireEvent.blur(number)
      expect(store.get(editorSessionStateAtom).past).toHaveLength(0)
    } finally {
      document.removeEventListener('keydown', outerEscape)
    }
  })

  it('does not save or cancel while IME composition owns Enter and Escape', () => {
    const view = renderNumber()
    const number = view.getByRole('spinbutton')
    fireEvent.focus(number)
    fireEvent.compositionStart(number)
    fireEvent.change(number, { target: { value: '26' } })
    fireEvent.keyDown(number, { key: 'Enter', isComposing: true })
    fireEvent.keyDown(number, { key: 'Escape' })
    expect(number).toHaveValue(26)
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(13)

    fireEvent.compositionEnd(number)
    fireEvent.keyDown(number, { key: 'Enter' })

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(26)
    expect(store.get(editorSessionStateAtom).past).toHaveLength(1)
  })

  it('discards a stale draft when an external update changes the same setting', () => {
    const view = renderNumber()
    const number = view.getByRole('spinbutton')
    fireEvent.focus(number)
    fireEvent.change(number, { target: { value: '30' } })
    const current = store.get(chatSettingsStateAtom)
    act(() => {
      store.set(replaceExternalAppearanceAtom, {
        presets: current.presets,
        profile: { ...current.profile, appearance: { ...current.profile.appearance, fontSize: 22, blur: 6 } },
      })
    })
    expect(number).toHaveValue(22)

    fireEvent.blur(number)

    expect(store.get(chatSettingsStateAtom).profile.appearance).toMatchObject({ fontSize: 22, blur: 6 })
    expect(store.get(editorSessionStateAtom).past).toHaveLength(0)
  })

  it('preserves other externally updated fields when committing the numeric draft', () => {
    const view = renderNumber()
    const number = view.getByRole('spinbutton')
    fireEvent.focus(number)
    fireEvent.change(number, { target: { value: '23' } })
    const current = store.get(chatSettingsStateAtom)
    act(() => {
      store.set(replaceExternalAppearanceAtom, {
        presets: current.presets,
        profile: { ...current.profile, appearance: { ...current.profile.appearance, blur: 6 } },
      })
    })
    expect(number).toHaveValue(23)

    fireEvent.keyDown(number, { key: 'Enter' })

    expect(store.get(chatSettingsStateAtom).profile.appearance).toMatchObject({ fontSize: 23, blur: 6 })
    expect(store.get(editorSessionStateAtom).past).toHaveLength(1)
    act(() => store.set(undoStyleAtom))
    expect(store.get(chatSettingsStateAtom).profile.appearance).toMatchObject({ fontSize: 13, blur: 6 })
  })

  it('does not save unfinished typing when the settings control unmounts', () => {
    const view = renderNumber()
    const number = view.getByRole('spinbutton')
    fireEvent.focus(number)
    fireEvent.change(number, { target: { value: '27' } })

    view.unmount()

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(13)
    expect(store.get(editorSessionStateAtom).past).toHaveLength(0)
  })

  it.each([
    { settingKey: 'fontSize', max: 40, first: '28', last: '30' },
    { settingKey: 'blur', max: 20, first: '5', last: '8' },
  ] satisfies { settingKey: NumberSliderSettingKey; max: number; first: string; last: string }[])(
    'finishes a typed draft before grouping a pointer drag on the $settingKey range',
    async ({ settingKey, max, first, last }) => {
      const user = userEvent.setup()
      const view = renderWithStore(
        <>
          <YLCNumberSlider settingKey='fontSize' labelKey='content.setting.fontSize' min={10} max={40} />
          {settingKey !== 'fontSize' && <YLCNumberSlider settingKey={settingKey} labelKey='content.setting.blur' min={0} max={max} />}
        </>,
        store,
      )
      const number = view.getByRole('spinbutton', { name: 'content.setting.fontSize' })
      await user.clear(number)
      await user.type(number, '24')
      const label = settingKey === 'fontSize' ? 'content.setting.fontSize' : 'content.setting.blur'
      const range = view.getByRole('slider', { name: label })

      // Native range focus blurs the previous input after pointerdown. The
      // typed commit must finish before the new continuous gesture begins.
      fireEvent.pointerDown(range, { pointerId: 15 })
      fireEvent.blur(number)
      fireEvent.input(range, { target: { value: first } })
      fireEvent.input(range, { target: { value: last } })
      expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(24)
      expect(store.get(editorSessionStateAtom).past).toHaveLength(1)
      expect(store.get(editorSessionStateAtom).draftProfile?.appearance[settingKey]).toBe(Number(last))

      fireEvent.pointerUp(range, { pointerId: 15 })

      expect(store.get(editorSessionStateAtom).past).toHaveLength(2)
      expect(store.get(chatSettingsStateAtom).profile.appearance[settingKey]).toBe(Number(last))
      act(() => store.set(undoStyleAtom))
      expect(store.get(chatSettingsStateAtom).profile.appearance).toMatchObject({ fontSize: 24, blur: 0 })
      act(() => store.set(undoStyleAtom))
      expect(store.get(chatSettingsStateAtom).profile.appearance).toMatchObject({ fontSize: 13, blur: 0 })
    },
  )
})
