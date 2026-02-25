import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatStore } from '@/shared/stores'
import { AddPresetItem } from './AddPresetItem'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

vi.stubGlobal('crypto', {
  ...globalThis.crypto,
  randomUUID: () => 'preset-test-id',
})

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

describe('AddPresetItem', () => {
  beforeEach(() => {
    resetStore({ addPresetEnabled: true })
  })

  it('adds a new preset from the current style and disables the button', () => {
    const { getByText } = render(<AddPresetItem />)

    const addButton = getByText('content.preset.addMessage').closest('button') as HTMLButtonElement
    fireEvent.click(addButton)

    const state = useYTDLiveChatStore.getState()
    expect(state.presetItemIds).toContain('preset-test-id')
    expect(state.addPresetEnabled).toBe(false)
    expect(addButton.disabled).toBe(true)
  })
})
