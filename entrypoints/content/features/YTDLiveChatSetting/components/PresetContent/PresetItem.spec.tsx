import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { useYTDLiveChatStore } from '@/shared/stores'
import { ylcInitSetting } from '@/shared/utils'
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

const baseState = useYTDLiveChatStore.getState()

const resetStore = (overrides: Partial<typeof baseState> = {}) => {
  useYTDLiveChatStore.setState(
    {
      ...baseState,
      ...overrides,
      coordinates: { ...baseState.coordinates },
      size: { ...baseState.size },
      presetItemIds: [...baseState.presetItemIds],
      presetItemStyles: { ...baseState.presetItemStyles },
      presetItemTitles: { ...baseState.presetItemTitles },
    },
    true,
  )
}

const findPresetCard = (input: HTMLInputElement) => {
  const node = input.closest('.ylc-preset')
  if (!node) throw new Error('Preset card not found')
  return node as HTMLElement
}

describe('PresetItem', () => {
  beforeEach(() => {
    resetStore()
  })

  it('deletes a preset after confirmation', async () => {
    useYTDLiveChatStore.setState({
      presetItemIds: [...baseState.presetItemIds, 'custom'],
      presetItemTitles: { ...baseState.presetItemTitles, custom: 'Custom Preset' },
      presetItemStyles: { ...baseState.presetItemStyles, custom: ylcInitSetting },
    })

    const { findByRole, findByText, getByDisplayValue } = render(<PresetItem id='custom' />)

    const titleInput = getByDisplayValue('Custom Preset') as HTMLInputElement
    const card = findPresetCard(titleInput)
    const actionContainer = card.querySelector('[data-ylc-preset-actions]') as HTMLElement
    const actionButtons = actionContainer.querySelectorAll('button')
    const deleteButtonInCard = actionButtons[actionButtons.length - 1]

    fireEvent.click(deleteButtonInCard)

    expect(await findByRole('dialog')).toHaveStyle({ zIndex: String(CONTENT_UI_LAYER.nestedModal) })
    const deleteButton = await findByText('content.preset.delete', { selector: 'button' })
    fireEvent.click(deleteButton)

    expect(useYTDLiveChatStore.getState().presetItemIds).not.toContain('custom')
  })

  it('renders built-in presets from the localized catalog and prevents editing or deletion', () => {
    useYTDLiveChatStore.setState({
      presetItemTitles: { ...baseState.presetItemTitles, default1: 'Stale localized title' },
    })

    const { getByDisplayValue, queryByRole } = render(<PresetItem id='default1' />)

    expect((getByDisplayValue('content.preset.defaultTitle') as HTMLInputElement).readOnly).toBe(true)
    expect(queryByRole('button', { name: 'content.aria.deletePreset' })).toBeNull()
  })

  it('disables applying a preset when its style is unavailable', () => {
    useYTDLiveChatStore.setState({
      presetItemIds: [...baseState.presetItemIds, 'broken'],
      presetItemTitles: { ...baseState.presetItemTitles, broken: 'Broken' },
    })

    const { getByRole } = render(<PresetItem id='broken' />)

    expect(getByRole('button', { name: 'content.aria.applyPreset' })).toBeDisabled()
  })
})
