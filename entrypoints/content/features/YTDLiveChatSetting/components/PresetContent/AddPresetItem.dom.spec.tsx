import { act, fireEvent, within } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import type { ChatGeometry, ChatProfile } from '@/shared/settings/model'
import { MAX_CUSTOM_PRESETS } from '@/shared/settings/persistConfig'
import { chatSettingsStateAtom, editorSessionStateAtom } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { PresetContent } from '../PresetContent'
import { AddPresetItem } from './AddPresetItem'

describe('AddPresetItem', () => {
  const store = createStore()
  beforeEach(() => {
    store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)
    store.set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null })
  })

  it('restores the saved appearance and display options without moving the panel', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    const savedProfile: ChatProfile = {
      appearance: {
        ...profile.appearance,
        backgroundColor: { r: 20, g: 40, b: 60, a: 0.5 },
        fontSize: 24,
        blur: 8,
        showUserIcon: false,
      },
      display: { idleVisibility: 'auto-hide', contentMode: 'messages-only' },
    }
    store.set(editorSessionStateAtom, {
      draftProfile: savedProfile,
      past: [],
      future: [],
      activeGesture: null,
    })
    const { getByRole, getByDisplayValue } = renderWithStore(<PresetContent />, store)

    const addButton = getByRole('button', { name: 'content.preset.addMessage' })
    fireEvent.click(addButton)

    const currentGeometry: ChatGeometry = {
      reference: 'player',
      rect: { x: 0.4, y: 0.2, width: 0.3, height: 0.5 },
      pinned: true,
    }
    act(() => {
      store.set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null })
      store.set(chatSettingsStateAtom, {
        ...store.get(chatSettingsStateAtom),
        profile: DEFAULT_CHAT_SETTINGS.profile,
        geometry: currentGeometry,
      })
    })

    const savedCard = getByDisplayValue('content.preset.addItemTitle').closest('[data-ylc-preset-item]')
    if (!(savedCard instanceof HTMLElement)) throw new Error('Missing saved preset card.')
    fireEvent.click(within(savedCard).getByRole('button', { name: 'content.aria.applyPreset' }))

    expect(store.get(chatSettingsStateAtom).profile).toEqual(savedProfile)
    expect(store.get(chatSettingsStateAtom).geometry).toEqual(currentGeometry)
    expect(addButton).toBeEnabled()
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
