import { fireEvent } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it } from 'vitest'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
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
  beforeEach(() => {
    store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)
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
    fireEvent.click(deleteButton)

    expect(await findByRole('dialog')).toHaveStyle({ zIndex: String(CONTENT_UI_LAYER.nestedModal) })
    fireEvent.click(await findByText('content.preset.delete', { selector: 'button' }))

    expect(store.get(chatSettingsStateAtom).presets.some(preset => preset.id === 'custom')).toBe(false)
  })

  it('renders built-in presets from the code catalog and prevents editing or deletion', () => {
    const { getByDisplayValue, queryByRole } = renderWithStore(<PresetItem id='standard' reorder={reorder} />, store)

    expect((getByDisplayValue('content.preset.defaultTitle') as HTMLInputElement).readOnly).toBe(true)
    expect(queryByRole('button', { name: 'content.aria.deletePreset' })).toBeNull()
  })

  it('disables applying a missing preset', () => {
    const { getByRole } = renderWithStore(<PresetItem id='missing' reorder={reorder} />, store)
    expect(getByRole('button', { name: 'content.aria.applyPreset' })).toBeDisabled()
  })
})
