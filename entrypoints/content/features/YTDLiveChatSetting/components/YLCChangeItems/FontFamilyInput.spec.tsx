import { fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom, editorSessionStateAtom, localeStateAtom } from '@/shared/state/atoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { FontFamilyInput } from './FontFamilyInput'

const dispatchMouseDown = (target: EventTarget, path: EventTarget[]) => {
  const outsideEvent = new MouseEvent('mousedown', { bubbles: true })
  Object.defineProperty(outsideEvent, 'composedPath', {
    value: () => path,
  })
  target.dispatchEvent(outsideEvent)
}

const store = createTestStore()

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
    resetStore()
    store.set(localeStateAtom, untranslatedLocale)
  })

  it('toggles menu visibility from trigger button', () => {
    const { getByRole, queryByTestId } = renderFontFamilyInput()

    const trigger = getByRole('button', { name: 'content.setting.fontFamily' })
    expect(queryByTestId('font-family-search')).toBeNull()

    fireEvent.click(trigger)
    expect(queryByTestId('font-family-search')).toBeInTheDocument()

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
  })

  it('commits highlighted option with Enter key', () => {
    const { getByRole, getByTestId } = renderFontFamilyInput()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.change(getByTestId('font-family-search'), { target: { value: 'Roboto Slab' } })
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'Enter' })

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontFamily).toBe('Roboto Slab')
  })

  it.each([
    { search: 'Roboto Slab', expected: 'Roboto Slab' },
    { search: 'My Custom Font', expected: null },
  ])('waits for composition to finish before Enter commits the search "$search"', ({ search, expected }) => {
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

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontFamily).toBe(expected)
    expect(store.get(editorSessionStateAtom).past).toEqual([...historyBefore, before])
    expect(queryByTestId('font-family-search')).not.toBeInTheDocument()
  })

  it('commits default when no option matches and Enter is pressed', () => {
    const { getByRole, getByTestId } = renderFontFamilyInput('Roboto')

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.change(getByTestId('font-family-search'), { target: { value: 'My Custom Font' } })
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'Enter' })

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontFamily).toBeNull()
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
    const { getByRole, getByTestId, queryByTestId } = renderFontFamilyInput()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    fireEvent.keyDown(getByTestId('font-family-search'), { key: 'Escape' })
    expect(queryByTestId('font-family-search')).toBeNull()

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    expect(getByTestId('font-family-search')).toBeInTheDocument()
    dispatchMouseDown(document.body, [document.body])
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
