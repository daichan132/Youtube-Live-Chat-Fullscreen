import { fireEvent } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { MAX_CUSTOM_PRESETS } from '@/shared/settings/persistConfig'
import { chatSettingsStateAtom, editorSessionStateAtom } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { AddPresetItem } from './AddPresetItem'

vi.stubGlobal('crypto', {
  ...globalThis.crypto,
  randomUUID: () => 'preset-test-id',
})

describe('AddPresetItem', () => {
  const store = createStore()
  beforeEach(() => {
    store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)
    store.set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null })
  })

  it('adds a self-contained preset from the effective profile', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(editorSessionStateAtom, {
      draftProfile: {
        ...profile,
        appearance: { ...profile.appearance, fontSize: 24 },
      },
      past: [],
      future: [],
      activeGesture: null,
    })
    const { getByText } = renderWithStore(<AddPresetItem />, store)

    const addButton = getByText('content.preset.addMessage').closest('button') as HTMLButtonElement
    fireEvent.click(addButton)

    expect(store.get(chatSettingsStateAtom).presets.at(-1)).toMatchObject({
      kind: 'custom',
      id: 'preset-test-id',
      name: 'content.preset.addItemTitle',
      profile: {
        appearance: { fontSize: 24 },
      },
    })
    expect(addButton.disabled).toBe(false)
  })

  it('disables creation when the custom preset limit is reached', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    const presets = Array.from({ length: MAX_CUSTOM_PRESETS }, (_, index) => ({
      kind: 'custom' as const,
      id: `custom-${index}`,
      name: `Custom ${index}`,
      profile,
    }))
    store.set(chatSettingsStateAtom, { ...DEFAULT_CHAT_SETTINGS, presets })
    const { getByRole } = renderWithStore(<AddPresetItem />, store)

    const addButton = getByRole('button', { name: 'content.preset.addMessage' })
    expect(addButton).toBeDisabled()
    fireEvent.click(addButton)
    expect(store.get(chatSettingsStateAtom).presets).toHaveLength(MAX_CUSTOM_PRESETS)
  })
})
