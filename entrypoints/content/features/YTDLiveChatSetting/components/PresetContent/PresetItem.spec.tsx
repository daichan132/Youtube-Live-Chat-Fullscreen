import { act, fireEvent } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it } from 'vitest'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom, editorSessionStateAtom, localeStateAtom } from '@/shared/state/atoms'
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
    expect(await findByRole('dialog')).toHaveAccessibleDescription(/Custom Preset/)
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

  it('keeps built-in names read-only but allows confirmed deletion', async () => {
    const { getByDisplayValue, getByRole, findByText } = renderWithStore(<PresetItem id='standard' reorder={reorder} />, store)

    expect((getByDisplayValue('content.preset.defaultTitle') as HTMLInputElement).readOnly).toBe(true)
    fireEvent.click(getByRole('button', { name: 'content.aria.deletePreset' }))
    fireEvent.click(await findByText('content.preset.delete', { selector: 'button' }))
    expect(store.get(chatSettingsStateAtom).presets.some(preset => preset.id === 'standard')).toBe(false)
  })

  it.each(['Movie Night', "$& $$ $` $' {position}"])('names every row control with the exact preset name %s', name => {
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(chatSettingsStateAtom, {
      ...DEFAULT_CHAT_SETTINGS,
      presets: [...DEFAULT_CHAT_SETTINGS.presets, { kind: 'custom', id: 'custom', name, profile }],
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

    expect(getByRole('button', { name: `Reorder ${name}` })).toBeInTheDocument()
    expect(getByRole('button', { name: `Apply ${name}` })).toBeInTheDocument()
    expect(getByRole('button', { name: `Delete ${name}` })).toBeInTheDocument()
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
  it('marks matching profiles as current, follows preview changes, and ignores geometry-only changes', () => {
    const current = store.get(chatSettingsStateAtom)
    store.set(chatSettingsStateAtom, {
      ...current,
      presets: [...current.presets, { kind: 'custom', id: 'matching', name: 'Matching', profile: current.profile }],
    })
    const { getByRole } = renderWithStore(<PresetItem id='matching' reorder={reorder} />, store)
    const apply = getByRole('button', { name: 'content.aria.applyPreset' })
    expect(apply).toHaveAttribute('aria-pressed', 'true')
    expect(apply).toBeEnabled()
    act(() =>
      store.set(chatSettingsStateAtom, {
        ...store.get(chatSettingsStateAtom),
        geometry: { reference: 'player', rect: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, pinned: true },
      }),
    )
    expect(apply).toHaveAttribute('aria-pressed', 'true')
    act(() =>
      store.set(editorSessionStateAtom, {
        draftProfile: { ...current.profile, appearance: { ...current.profile.appearance, fontSize: 31 } },
        past: [],
        future: [],
        activeGesture: null,
      }),
    )
    expect(apply).toHaveAttribute('aria-pressed', 'false')
    expect(apply).toBeEnabled()
    act(() => store.set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null }))
    expect(apply).toHaveAttribute('aria-pressed', 'true')
  })
})
