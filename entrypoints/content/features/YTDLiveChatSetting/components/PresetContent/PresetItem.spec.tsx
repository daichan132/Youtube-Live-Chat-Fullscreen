import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  let node: HTMLElement | null = input
  while (node && !node.className.includes('ylc-theme-surface')) {
    node = node.parentElement
  }
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

    const { findByText, getByDisplayValue } = render(<PresetItem id='custom' />)

    const titleInput = getByDisplayValue('Custom Preset') as HTMLInputElement
    const card = findPresetCard(titleInput)
    const actionContainer = card.querySelector('div.flex.transition-opacity') as HTMLElement
    const icons = actionContainer.querySelectorAll('svg')
    const deleteIcon = icons[icons.length - 1]

    fireEvent.click(deleteIcon)

    const deleteButton = await findByText('content.preset.delete', { selector: 'button' })
    fireEvent.click(deleteButton)

    expect(useYTDLiveChatStore.getState().presetItemIds).not.toContain('custom')
  })
})
