import { fireEvent } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { expect, it } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom, localeStateAtom } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { PresetContent } from './PresetContent'

it('announces the literal preset name and new position after a keyboard move', () => {
  const store = createStore()
  const profile = DEFAULT_CHAT_SETTINGS.profile
  store.set(chatSettingsStateAtom, {
    ...DEFAULT_CHAT_SETTINGS,
    presets: [
      { kind: 'custom', id: 'first', name: '{position}', profile },
      { kind: 'custom', id: 'second', name: 'Second preset', profile },
    ],
  })
  store.set(localeStateAtom, {
    ...store.get(localeStateAtom),
    messages: {
      ...store.get(localeStateAtom).messages,
      'content.aria.reorderPreset': 'Reorder {name}',
      'content.aria.presetMoved': 'Moved {name} to position {position}',
    },
  })
  const { container, getByRole } = renderWithStore(<PresetContent />, store)

  fireEvent.keyDown(getByRole('button', { name: 'Reorder {position}' }), { key: 'ArrowDown' })

  expect(store.get(chatSettingsStateAtom).presets.map(preset => preset.id)).toEqual(['second', 'first'])
  expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('Moved {position} to position 2')
})
