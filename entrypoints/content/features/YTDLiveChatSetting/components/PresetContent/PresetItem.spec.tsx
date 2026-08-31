import { fireEvent } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it } from 'vitest'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom, localeStateAtom } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { PresetItem } from './PresetItem'

const reorder = {
  activeId: null,
  getHandleProps: () => ({ onPointerDown: () => {}, onKeyDown: () => {} }),
}

const findPresetCard = (input: HTMLInputElement) => {
  const node = input.closest('.ylc-preset')
  if (!node) throw new Error('Preset card not found')
  return node as HTMLElement
}

describe('PresetItem', () => {
  const store = createStore()
  const untranslatedLocale = store.get(localeStateAtom)
  beforeEach(() => {
    store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)
    store.set(localeStateAtom, untranslatedLocale)
  })

  it('deletes a custom preset after confirmation', async () => {
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(chatSettingsStateAtom, {
      ...DEFAULT_CHAT_SETTINGS,
      presets: [...DEFAULT_CHAT_SETTINGS.presets, { kind: 'custom', id: 'custom', name: 'Custom Preset', profile }],
    })

    const { findByRole, findByText, getByDisplayValue } = renderWithStore(<PresetItem id='custom' reorder={reorder} />, store)

    const titleInput = getByDisplayValue('Custom Preset') as HTMLInputElement
    const card = findPresetCard(titleInput)
    const actionContainer = card.querySelector('[data-ylc-preset-actions]') as HTMLElement
    const actionButtons = actionContainer.querySelectorAll('button')
    const deleteButton = actionButtons.item(actionButtons.length - 1)
    if (!deleteButton) throw new Error('Missing preset delete button.')
    deleteButton.focus()
    fireEvent.click(deleteButton)

    expect(await findByRole('dialog')).toHaveStyle({ zIndex: String(CONTENT_UI_LAYER.nestedModal) })
    fireEvent.click(await findByText('content.preset.delete', { selector: 'button' }))

    expect(store.get(chatSettingsStateAtom).presets.some(preset => preset.id === 'custom')).toBe(false)
  })

  it('persists a custom name only when editing is committed', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(chatSettingsStateAtom, {
      ...DEFAULT_CHAT_SETTINGS,
      presets: [...DEFAULT_CHAT_SETTINGS.presets, { kind: 'custom', id: 'custom', name: 'Before', profile }],
    })
    const { getByDisplayValue } = renderWithStore(<PresetItem id='custom' reorder={reorder} />, store)
    const input = getByDisplayValue('Before') as HTMLInputElement

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'After' } })
    expect(store.get(chatSettingsStateAtom).presets.at(-1)).toMatchObject({ name: 'Before' })

    fireEvent.blur(input)
    expect(store.get(chatSettingsStateAtom).presets.at(-1)).toMatchObject({ name: 'After' })
  })

  it('restores the stored name when editing is cancelled with Escape', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(chatSettingsStateAtom, {
      ...DEFAULT_CHAT_SETTINGS,
      presets: [...DEFAULT_CHAT_SETTINGS.presets, { kind: 'custom', id: 'custom', name: 'Stored', profile }],
    })
    const { getByDisplayValue } = renderWithStore(<PresetItem id='custom' reorder={reorder} />, store)
    const input = getByDisplayValue('Stored') as HTMLInputElement

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Draft' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(input).toHaveValue('Stored')
    expect(store.get(chatSettingsStateAtom).presets.at(-1)).toMatchObject({ name: 'Stored' })
  })

  it('renders built-in presets from the code catalog and prevents editing or deletion', () => {
    const { getByDisplayValue, queryByRole } = renderWithStore(<PresetItem id='standard' reorder={reorder} />, store)

    expect((getByDisplayValue('content.preset.defaultTitle') as HTMLInputElement).readOnly).toBe(true)
    expect(queryByRole('button', { name: 'content.aria.deletePreset' })).toBeNull()
  })

  it('names the preset in every row control so rows do not announce identically', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(chatSettingsStateAtom, {
      ...DEFAULT_CHAT_SETTINGS,
      presets: [...DEFAULT_CHAT_SETTINGS.presets, { kind: 'custom', id: 'custom', name: 'Movie Night', profile }],
    })
    store.set(localeStateAtom, {
      ...store.get(localeStateAtom),
      messages: {
        ...store.get(localeStateAtom).messages,
        'content.aria.reorderPreset': 'Reorder {name}',
        'content.aria.applyPreset': 'Apply {name}',
        'content.aria.deletePreset': 'Delete {name}',
      },
    })

    const { getByRole } = renderWithStore(<PresetItem id='custom' reorder={reorder} />, store)

    expect(getByRole('button', { name: 'Reorder Movie Night' })).toBeInTheDocument()
    expect(getByRole('button', { name: 'Apply Movie Night' })).toBeInTheDocument()
    expect(getByRole('button', { name: 'Delete Movie Night' })).toBeInTheDocument()
  })

  it('falls back to the untitled label when a custom preset has no name left', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(chatSettingsStateAtom, {
      ...DEFAULT_CHAT_SETTINGS,
      presets: [...DEFAULT_CHAT_SETTINGS.presets, { kind: 'custom', id: 'blank', name: '', profile }],
    })
    store.set(localeStateAtom, {
      ...store.get(localeStateAtom),
      messages: {
        ...store.get(localeStateAtom).messages,
        'content.aria.applyPreset': 'Apply {name}',
        'content.preset.addItemTitle': 'Untitled',
      },
    })

    const { getByRole } = renderWithStore(<PresetItem id='blank' reorder={reorder} />, store)

    expect(getByRole('button', { name: 'Apply Untitled' })).toBeInTheDocument()
  })

  it('disables applying a missing preset', () => {
    const { getByRole } = renderWithStore(<PresetItem id='missing' reorder={reorder} />, store)
    expect(getByRole('button', { name: 'content.aria.applyPreset' })).toBeDisabled()
  })
})
