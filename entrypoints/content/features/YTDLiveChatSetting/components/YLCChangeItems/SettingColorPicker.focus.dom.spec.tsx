import { act, fireEvent, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { chatSettingsStateAtom, editorSessionStateAtom } from '@/shared/state/atoms'
import { undoStyleAtom } from '@/shared/state/commands'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { FontFamilyInput } from './FontFamilyInput'
import { SettingColorPicker } from './SettingColorPicker'
import { YLCColorPicker } from './YLCColorPicker'

const color = { r: 1, g: 2, b: 3, a: 0.4 }

describe('color picker focus boundary', () => {
  it('keeps internal Tab navigation open and replaces the picker when keyboard focus reaches another color', async () => {
    const user = userEvent.setup()
    const view = render(
      <>
        <SettingColorPicker rgba={color} label='Background color' onChange={vi.fn()} />
        <SettingColorPicker rgba={color} label='Text color' onChange={vi.fn()} />
      </>,
    )
    const background = view.getByRole('button', { name: 'Background color' })
    const text = view.getByRole('button', { name: 'Text color' })
    await user.click(background)
    for (const slider of view.getAllByRole('slider')) {
      await user.tab()
      expect(slider).toHaveFocus()
      expect(view.getAllByRole('dialog')).toHaveLength(1)
      expect(background).toHaveAttribute('aria-expanded', 'true')
    }

    await user.tab()
    expect(text).toHaveFocus()
    expect(view.queryByRole('dialog')).not.toBeInTheDocument()
    expect(background).toHaveAttribute('aria-expanded', 'false')
    await user.keyboard('{Enter}')

    expect(view.getAllByRole('dialog')).toHaveLength(1)
    expect(background).toHaveAttribute('aria-expanded', 'false')
    expect(text).toHaveAttribute('aria-expanded', 'true')
    expect(text).toHaveFocus()
  })

  it('closes when Shift+Tab leaves the trigger without stealing the previous control focus', async () => {
    const user = userEvent.setup()
    const view = render(
      <>
        <button type='button'>Previous control</button>
        <SettingColorPicker rgba={color} label='Background color' onChange={vi.fn()} />
      </>,
    )
    await user.click(view.getByRole('button', { name: 'Background color' }))

    await user.tab({ shift: true })

    expect(view.getByRole('button', { name: 'Previous control' })).toHaveFocus()
    expect(view.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes before keyboard activation opens the font search', async () => {
    const user = userEvent.setup()
    const view = renderWithStore(
      <>
        <SettingColorPicker rgba={color} label='Background color' onChange={vi.fn()} />
        <FontFamilyInput />
      </>,
      createTestStore(),
    )
    await user.click(view.getByRole('button', { name: 'Background color' }))
    for (let index = 0; index < 4; index += 1) await user.tab()
    expect(view.getByRole('button', { name: 'content.setting.fontFamily' })).toHaveFocus()

    await user.keyboard('{Enter}')

    expect(view.getByRole('combobox')).toBeInTheDocument()
    expect(view.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('finishes a held color gesture once when focus leaves before keyup', async () => {
    const user = userEvent.setup()
    const store = createTestStore()
    const before = store.get(chatSettingsStateAtom)
    store.set(chatSettingsStateAtom, {
      ...before,
      profile: { ...before.profile, appearance: { ...before.profile.appearance, backgroundColor: color } },
    })
    const view = renderWithStore(
      <>
        <YLCColorPicker settingKey='backgroundColor' labelKey='content.setting.backgroundColor' />
        <button type='button'>Next control</button>
      </>,
      store,
    )
    await user.click(view.getByRole('button', { name: 'content.setting.backgroundColor' }))
    const alpha = view.getByRole('slider', { name: 'Alpha' })
    act(() => alpha.focus())
    fireEvent.keyDown(alpha, { key: 'ArrowRight', keyCode: 39 })
    fireEvent.keyDown(alpha, { key: 'ArrowRight', keyCode: 39, repeat: true })
    const draft = store.get(editorSessionStateAtom).draftProfile?.appearance.backgroundColor
    expect(draft?.a).toBeGreaterThan(color.a)
    expect(store.get(chatSettingsStateAtom).profile.appearance.backgroundColor).toEqual(color)

    act(() => view.getByRole('button', { name: 'Next control' }).focus())
    fireEvent.keyUp(view.getByRole('button', { name: 'Next control' }), { key: 'ArrowRight', keyCode: 39 })

    expect(view.queryByRole('dialog')).not.toBeInTheDocument()
    expect(view.getByRole('button', { name: 'Next control' })).toHaveFocus()
    expect(store.get(chatSettingsStateAtom).profile.appearance.backgroundColor).toEqual(draft)
    expect(store.get(editorSessionStateAtom).past).toHaveLength(1)
    expect(store.get(editorSessionStateAtom).activeGesture).toBeNull()
    act(() => store.set(undoStyleAtom))
    expect(store.get(chatSettingsStateAtom).profile.appearance.backgroundColor).toEqual(color)
  })
})
