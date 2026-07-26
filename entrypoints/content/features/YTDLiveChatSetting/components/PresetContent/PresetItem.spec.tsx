import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { PresetItem } from './PresetItem'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setActivatorNodeRef: () => {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}))

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

const findPresetCard = (input: HTMLInputElement) => {
  const node = input.closest('.ylc-preset')
  if (!node) throw new Error('Preset card not found')
  return node as HTMLElement
}

describe('PresetItem', () => {
  beforeEach(() => {
    useChatSettingsStore.setState(DEFAULT_CHAT_SETTINGS)
  })

  it('deletes a custom preset after confirmation', async () => {
    const profile = useChatSettingsStore.getState().profile
    useChatSettingsStore.setState({
      presets: [...DEFAULT_CHAT_SETTINGS.presets, { kind: 'custom', id: 'custom', name: 'Custom Preset', profile }],
    })

    const { findByRole, findByText, getByDisplayValue } = render(<PresetItem id='custom' />)

    const titleInput = getByDisplayValue('Custom Preset') as HTMLInputElement
    const card = findPresetCard(titleInput)
    const actionContainer = card.querySelector('[data-ylc-preset-actions]') as HTMLElement
    const actionButtons = actionContainer.querySelectorAll('button')
    fireEvent.click(actionButtons[actionButtons.length - 1])

    expect(await findByRole('dialog')).toHaveStyle({ zIndex: String(CONTENT_UI_LAYER.nestedModal) })
    fireEvent.click(await findByText('content.preset.delete', { selector: 'button' }))

    expect(useChatSettingsStore.getState().presets.some(preset => preset.id === 'custom')).toBe(false)
  })

  it('renders built-in presets from the code catalog and prevents editing or deletion', () => {
    const { getByDisplayValue, queryByRole } = render(<PresetItem id='standard' />)

    expect((getByDisplayValue('content.preset.defaultTitle') as HTMLInputElement).readOnly).toBe(true)
    expect(queryByRole('button', { name: 'content.aria.deletePreset' })).toBeNull()
  })

  it('disables applying a missing preset', () => {
    const { getByRole } = render(<PresetItem id='missing' />)
    expect(getByRole('button', { name: 'content.aria.applyPreset' })).toBeDisabled()
  })
})
