import { act, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom, editorSessionStateAtom, localeStateAtom } from '@/shared/state/atoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { createStyleHistoryCommands } from '../../styleHistoryCommands'
import { FontFamilyInput } from './FontFamilyInput'

let store = createTestStore()

const resetStore = (fontFamily: string | null = null) => {
  store.set(chatSettingsStateAtom, {
    ...DEFAULT_CHAT_SETTINGS,
    profile: {
      ...DEFAULT_CHAT_SETTINGS.profile,
      appearance: {
        ...DEFAULT_CHAT_SETTINGS.profile.appearance,
        fontFamily,
      },
    },
  })
}

const renderFontFamilyInput = (fontFamily = '') => {
  resetStore(fontFamily || null)
  return renderWithStore(<FontFamilyInput />, store)
}

describe('FontFamilyInput', () => {
  const untranslatedLocale = store.get(localeStateAtom)
  beforeEach(() => {
    store = createTestStore()
    store.set(localeStateAtom, untranslatedLocale)
  })

  it('toggles menu visibility from trigger button', () => {
    const { getByRole, queryByTestId } = renderFontFamilyInput()

    const trigger = getByRole('button', { name: 'content.setting.fontFamily' })
    expect(queryByTestId('font-family-search')).toBeNull()
    expect(trigger).toHaveAccessibleDescription('content.setting.fontFamilyDefault')

    fireEvent.click(trigger)
    expect(queryByTestId('font-family-search')).toBeInTheDocument()
    expect(getByRole('listbox', { name: 'content.setting.fontFamily' })).toBeInTheDocument()

    fireEvent.click(trigger)
    expect(queryByTestId('font-family-search')).toBeNull()
  })

  it('filters options using normalized text matching', () => {
    store.set(localeStateAtom, {
      ...store.get(localeStateAtom),
      messages: { ...store.get(localeStateAtom).messages, 'content.aria.fontsFound': 'Fonts found: {count}' },
    })
    const { container, getByRole, getByTestId, getByText } = renderFontFamilyInput()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.change(getByTestId('font-family-search'), { target: { value: 'robotoslab' } })

    const options = container.querySelectorAll('[role="option"]')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent('Roboto Slab')
    expect(getByText('Fonts found: 1')).toHaveAttribute('aria-live', 'polite')
    expect(getByRole('listbox')).not.toHaveAttribute('aria-live')
  })

  it('opens from the keyboard, focuses the search, and lets Undo restore a selected font', async () => {
    const user = userEvent.setup()
    const { getByRole, queryByRole } = renderFontFamilyInput('Roboto')
    const previousProfile = store.get(chatSettingsStateAtom).profile
    const trigger = getByRole('button', { name: 'content.setting.fontFamily' })

    await user.tab()
    expect(trigger).toHaveFocus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(getByRole('combobox', { name: 'content.setting.fontSearch' })).toHaveFocus())
    // Send real keyboard input to the focused control. Calling change/keyDown on
    // a queried node would hide a menu that never focuses its search field.
    await user.keyboard('Roboto Slab{Enter}')

    expect(queryByRole('combobox')).toBeNull()
    expect(trigger).toHaveTextContent('Roboto Slab')
    expect(trigger).toHaveAccessibleDescription('Roboto Slab')
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontFamily).toBe('Roboto Slab')
    act(() => {
      expect(createStyleHistoryCommands(store).undoYLCStyle()).toBe(true)
    })
    expect(store.get(chatSettingsStateAtom).profile).toEqual(previousProfile)
    expect(trigger).toHaveTextContent('Roboto')
    expect(trigger).toHaveAccessibleDescription('Roboto')
  })

  it.each(['Escape', 'selection'])('returns focus to the trigger after %s closes the keyboard search', async closeWith => {
    const user = userEvent.setup()
    const view = renderFontFamilyInput('Roboto')
    const trigger = view.getByRole('button', { name: 'content.setting.fontFamily' })
    await user.click(trigger)
    await waitFor(() => expect(view.getByRole('combobox')).toHaveFocus())
    if (closeWith === 'selection') await user.type(view.getByRole('combobox'), 'Roboto Slab')

    await user.keyboard(closeWith === 'Escape' ? '{Escape}' : '{Enter}')

    expect(view.queryByRole('combobox')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('exposes stable active option IDs through wraparound, filtering, and reopening a selected font', async () => {
    const user = userEvent.setup()
    const view = renderFontFamilyInput()
    const trigger = view.getByRole('button', { name: 'content.setting.fontFamily' })
    await user.click(trigger)
    const search = view.getByRole('combobox')
    await waitFor(() => expect(search).toHaveFocus())
    const options = view.getAllByRole('option')
    const first = options[0]
    const last = options[options.length - 1]
    const slab = view.getByRole('option', { name: /^Roboto Slab$/ })
    expect(slab.id).not.toBe('')
    const slabId = slab.id
    expect(search).toHaveAttribute('aria-controls', view.getByRole('listbox').id)
    expect(search).toHaveAttribute('aria-activedescendant', first?.id)
    await user.keyboard('{ArrowUp}')
    expect(search).toHaveAttribute('aria-activedescendant', last?.id)
    await user.keyboard('{ArrowDown}')
    expect(search).toHaveAttribute('aria-activedescendant', first?.id)
    await user.type(search, 'Roboto Slab')
    expect(search).toHaveAttribute('aria-activedescendant', slabId)
    await user.keyboard('{Enter}')
    await user.click(trigger)
    await waitFor(() => expect(view.getByRole('combobox')).toHaveFocus())
    expect(view.getByRole('combobox')).toHaveAttribute('aria-activedescendant', slabId)
    expect(view.getByRole('option', { name: /^Roboto Slab$/ }).id).toBe(slabId)
  })

  it('scrolls only the font list enough to reveal a distant active option', async () => {
    const user = userEvent.setup()
    const view = renderFontFamilyInput('Roboto')
    await user.click(view.getByRole('button', { name: 'content.setting.fontFamily' }))
    const search = view.getByRole('combobox')
    await waitFor(() => expect(search).toHaveFocus())
    const list = view.getByRole('listbox')
    list.getBoundingClientRect = () => ({ top: 100, bottom: 320, left: 0, right: 180, width: 180, height: 220 }) as DOMRect
    for (const option of view.getAllByRole('option')) {
      option.getBoundingClientRect = () => {
        const top = 100 + Array.from(list.children).indexOf(option) * 35 - list.scrollTop
        return { top, bottom: top + 32, left: 0, right: 180, width: 180, height: 32 } as DOMRect
      }
    }

    for (let index = 0; index < 12; index += 1) await user.keyboard('{ArrowDown}')

    const active = view.container.querySelector('.ylc-font-combobox-option-active')
    if (!active) throw new Error('Expected active font option')
    expect(list.scrollTop).toBeGreaterThan(0)
    expect(active.getBoundingClientRect().top).toBeGreaterThanOrEqual(100)
    expect(active.getBoundingClientRect().bottom).toBeLessThanOrEqual(320)
    expect(search).toHaveFocus()
  })

  it('lets Tab leave the font composite without walking every option', async () => {
    const user = userEvent.setup()
    const view = renderWithStore(
      <>
        <FontFamilyInput />
        <button type='button'>Next control</button>
      </>,
      store,
    )
    await user.click(view.getByRole('button', { name: 'content.setting.fontFamily' }))
    await waitFor(() => expect(view.getByRole('combobox')).toHaveFocus())
    expect(view.getByRole('listbox')).toHaveAttribute('tabindex', '-1')

    await user.tab()

    expect(view.getByRole('button', { name: 'Next control' })).toHaveFocus()
    expect(view.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('keeps keyboard navigation active when scrolling brings another option under a stationary pointer', async () => {
    const user = userEvent.setup()
    const view = renderFontFamilyInput('Roboto')
    await user.click(view.getByRole('button', { name: 'content.setting.fontFamily' }))
    const search = view.getByRole('combobox')
    await waitFor(() => expect(search).toHaveFocus())
    await user.keyboard('{ArrowDown}{ArrowDown}')
    const keyboardActiveId = search.getAttribute('aria-activedescendant')
    const first = view.getAllByRole('option')[0]
    if (!first) throw new Error('Expected a font option')
    expect(keyboardActiveId).not.toBe(first.id)

    fireEvent.mouseOver(first)

    expect(search).toHaveAttribute('aria-activedescendant', keyboardActiveId)
    fireEvent.mouseMove(first)
    expect(search).toHaveAttribute('aria-activedescendant', first.id)
    expect(search).toHaveFocus()
  })

  it.each([
    { search: 'Roboto Slab', matches: true },
    { search: 'My Custom Font', matches: false },
  ])('waits for composition to finish before handling Enter for "$search"', ({ search, matches }) => {
    const { getByRole, getByTestId, queryByTestId } = renderFontFamilyInput('Roboto')
    const before = store.get(chatSettingsStateAtom).profile
    const historyBefore = store.get(editorSessionStateAtom).past

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    const input = getByTestId('font-family-search')
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: search } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })

    expect(store.get(chatSettingsStateAtom).profile).toEqual(before)
    expect(store.get(editorSessionStateAtom).past).toEqual(historyBefore)
    expect(queryByTestId('font-family-search')).toBeInTheDocument()

    fireEvent.compositionEnd(input)
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontFamily).toBe(matches ? 'Roboto Slab' : 'Roboto')
    expect(store.get(editorSessionStateAtom).past).toEqual(matches ? [...historyBefore, before] : historyBefore)
    if (matches) expect(queryByTestId('font-family-search')).not.toBeInTheDocument()
    else {
      expect(queryByTestId('font-family-search')).toBeInTheDocument()
      expect(input).toHaveValue(search)
    }
  })

  it('keeps the font and history unchanged after an unmatched Enter, and lets the search be corrected', async () => {
    const user = userEvent.setup()
    const view = renderFontFamilyInput('Roboto')
    const before = store.get(chatSettingsStateAtom)
    const historyBefore = store.get(editorSessionStateAtom)
    const trigger = view.getByRole('button', { name: 'content.setting.fontFamily' })
    await user.click(trigger)
    const input = view.getByRole('combobox')
    await waitFor(() => expect(input).toHaveFocus())
    await user.type(input, 'My Custom Font')
    expect(view.queryAllByRole('option')).toHaveLength(0)

    await user.keyboard('{Enter}{Enter}')

    expect(store.get(chatSettingsStateAtom)).toEqual(before)
    expect(store.get(editorSessionStateAtom)).toEqual(historyBefore)
    expect(trigger).toHaveTextContent('Roboto')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(input).toHaveFocus()
    expect(input).toHaveValue('My Custom Font')
    expect(input).not.toHaveAttribute('aria-activedescendant')

    await user.clear(input)
    await user.type(input, 'Roboto Slab{Enter}')

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontFamily).toBe('Roboto Slab')
    expect(store.get(editorSessionStateAtom).past).toEqual([...historyBefore.past, before.profile])
    expect(view.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('still commits the explicit Default option and lets Undo restore the selected font', () => {
    const view = renderFontFamilyInput('Roboto')
    const before = store.get(chatSettingsStateAtom).profile
    fireEvent.click(view.getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.click(view.getByRole('option', { name: /^content\.setting\.fontFamilyDefault$/ }))

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontFamily).toBeNull()
    expect(store.get(editorSessionStateAtom).past).toEqual([before])
    expect(view.queryByRole('combobox')).not.toBeInTheDocument()
    act(() => {
      expect(createStyleHistoryCommands(store).undoYLCStyle()).toBe(true)
    })
    expect(store.get(chatSettingsStateAtom).profile).toEqual(before)
  })

  it('normalizes a case-insensitive font input before committing', () => {
    const { getByRole, getByTestId } = renderFontFamilyInput()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.change(getByTestId('font-family-search'), { target: { value: 'roboto' } })
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'Enter' })

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontFamily).toBe('Roboto')
  })

  it('supports arrow navigation before Enter selection', async () => {
    const { container, getByRole, getByTestId } = renderFontFamilyInput()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'ArrowDown' })
    await waitFor(() => {
      const activeOption = container.querySelector('.ylc-font-combobox-option-active')
      expect(activeOption).toHaveTextContent('Roboto')
    })
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'Enter' })

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontFamily).toBe('Roboto')
  })

  it('closes the menu with Escape and outside click', async () => {
    const user = userEvent.setup()
    const { getByRole, getByTestId, queryByTestId } = renderFontFamilyInput()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'Escape' })
    expect(queryByTestId('font-family-search')).toBeNull()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    expect(getByTestId('font-family-search')).toBeInTheDocument()
    await user.click(document.body)
    await waitFor(() => {
      expect(queryByTestId('font-family-search')).toBeNull()
    })
  })

  it('shows default label for invalid stored value', () => {
    store.set(localeStateAtom, {
      ...store.get(localeStateAtom),
      messages: { ...store.get(localeStateAtom).messages, 'content.setting.fontFamilyDefault': 'Default' },
    })
    const { getByRole } = renderFontFamilyInput('NotInListFont')

    const trigger = getByRole('button', { name: 'content.setting.fontFamily' })
    expect(trigger).toHaveTextContent('Default')
  })

  it('answers a failed search with its own message instead of the field label', () => {
    store.set(localeStateAtom, {
      ...store.get(localeStateAtom),
      messages: {
        ...store.get(localeStateAtom).messages,
        'content.setting.fontFamily': 'Font',
        'content.setting.fontNotFound': 'No fonts match your search',
      },
    })
    const { container, getByRole, getByTestId } = renderFontFamilyInput()

    fireEvent.click(getByRole('button', { name: 'Font' }))
    fireEvent.change(getByTestId('font-family-search'), { target: { value: 'zzzznotafont' } })

    expect(container.querySelectorAll('[role="option"]')).toHaveLength(0)
    const empty = container.querySelector('.ylc-font-combobox-empty')
    expect(empty?.textContent).toBe('No fonts match your search')
  })
})
