import { act, fireEvent, within } from '@testing-library/react'
import { useAtomValue } from 'jotai'
import { createStore } from 'jotai/vanilla'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom, localeStateAtom, presetsAtom } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { PresetItem } from './PresetItem'

const reorder = {
  activeId: null,
  getHandleProps: () => ({ onPointerDown: () => {}, onKeyDown: () => {} }),
}

const FocusHarness = () => {
  const presets = useAtomValue(presetsAtom)
  return (
    <div>
      {presets.map(preset => (
        <PresetItem key={preset.id} id={preset.id} reorder={reorder} />
      ))}
      <button type='button' data-ylc-add-preset>
        Add preset
      </button>
    </div>
  )
}

describe('PresetItem deletion focus', () => {
  const store = createStore()
  const untranslatedLocale = store.get(localeStateAtom)

  beforeEach(() => {
    const profile = DEFAULT_CHAT_SETTINGS.profile
    store.set(chatSettingsStateAtom, {
      ...DEFAULT_CHAT_SETTINGS,
      presets: [
        ...DEFAULT_CHAT_SETTINGS.presets,
        { kind: 'custom', id: 'first-custom', name: 'First custom', profile },
        { kind: 'custom', id: 'second-custom', name: 'Second custom', profile },
      ],
    })
    store.set(localeStateAtom, untranslatedLocale)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('moves focus to the next preset after the focused row is deleted', async () => {
    let pendingFrame: FrameRequestCallback | null = null
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      pendingFrame = callback
      return 1
    })

    const view = renderWithStore(<FocusHarness />, store)
    const firstInput = view.getByDisplayValue('First custom')
    const firstCard = firstInput.closest<HTMLElement>('[data-ylc-preset-item]')
    const deleteButton = firstCard?.querySelector<HTMLButtonElement>('.ylc-preset-del')
    if (!deleteButton) throw new Error('Missing first preset delete button')

    deleteButton.focus()
    fireEvent.click(deleteButton)
    const dialog = await view.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'content.preset.delete' }))

    expect(view.queryByDisplayValue('First custom')).toBeNull()
    const frame = pendingFrame as FrameRequestCallback | null
    if (!frame) throw new Error('Expected focus restoration frame')
    act(() => frame(performance.now()))

    const secondInput = view.getByDisplayValue('Second custom')
    const secondCard = secondInput.closest<HTMLElement>('[data-ylc-preset-item]')
    const secondReorderButton = secondCard?.querySelector<HTMLButtonElement>('.ylc-preset-grip')
    expect(secondReorderButton).toHaveFocus()
  })
})
