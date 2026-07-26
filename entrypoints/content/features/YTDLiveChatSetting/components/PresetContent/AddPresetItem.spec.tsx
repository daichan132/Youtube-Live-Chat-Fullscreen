import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatEditorStore } from '@/entrypoints/content/settings/ChatEditorStore'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
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

describe('AddPresetItem', () => {
  beforeEach(() => {
    useChatSettingsStore.setState(DEFAULT_CHAT_SETTINGS)
    useChatEditorStore.getState().clear()
  })

  it('always allows adding a self-contained preset from the effective profile', () => {
    const profile = useChatSettingsStore.getState().profile
    useChatEditorStore.setState({
      draftProfile: {
        ...profile,
        appearance: { ...profile.appearance, fontSize: 24 },
      },
    })
    const { getByText } = render(<AddPresetItem />)

    const addButton = getByText('content.preset.addMessage').closest('button') as HTMLButtonElement
    fireEvent.click(addButton)

    expect(useChatSettingsStore.getState().presets.at(-1)).toMatchObject({
      kind: 'custom',
      id: 'preset-test-id',
      name: 'content.preset.addItemTitle',
      profile: {
        appearance: { fontSize: 24 },
      },
    })
    expect(addButton.disabled).toBe(false)
  })
})
