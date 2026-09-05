import { act, fireEvent } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from '@/shared/components/Modal'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { PresetItem } from './PresetItem'

const reorder = {
  activeId: null,
  getHandleProps: () => ({ onPointerDown: () => {}, onKeyDown: () => {} }),
}

const setup = () => {
  const store = createStore()
  store.set(chatSettingsStateAtom, {
    ...DEFAULT_CHAT_SETTINGS,
    presets: [{ kind: 'custom', id: 'custom', name: 'Stored', profile: DEFAULT_CHAT_SETTINGS.profile }],
  })
  const onRequestClose = vi.fn()
  const view = renderWithStore(
    <Modal isOpen ariaLabel='Settings' shouldFocusAfterRender={false} onRequestClose={onRequestClose}>
      <PresetItem id='custom' reorder={reorder} />
    </Modal>,
    store,
  )
  const input = view.getByDisplayValue('Stored') as HTMLInputElement
  act(() => input.focus())
  const renameExternally = () => {
    act(() => {
      const current = store.get(chatSettingsStateAtom)
      store.set(chatSettingsStateAtom, {
        ...current,
        presets: [{ kind: 'custom', id: 'custom', name: 'External', profile: current.profile }],
      })
    })
  }
  return { store, input, onRequestClose, renameExternally }
}

describe('preset name editing inside the settings modal', () => {
  it('cancels a draft without closing the settings modal', () => {
    const { store, input, onRequestClose } = setup()
    fireEvent.change(input, { target: { value: 'Draft' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onRequestClose).not.toHaveBeenCalled()
    expect(input).toHaveValue('Stored')
    expect(store.get(chatSettingsStateAtom).presets[0]).toMatchObject({ name: 'Stored' })
  })

  it('waits for IME composition to finish before committing with Enter', () => {
    const { store, input } = setup()
    fireEvent.change(input, { target: { value: '日本語' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })

    expect(input).toHaveFocus()
    expect(store.get(chatSettingsStateAtom).presets[0]).toMatchObject({ name: 'Stored' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input).not.toHaveFocus()
    expect(store.get(chatSettingsStateAtom).presets[0]).toMatchObject({ name: '日本語' })
  })

  it('does not overwrite an external rename when an untouched input loses focus', () => {
    const { store, input, renameExternally } = setup()
    renameExternally()
    act(() => input.blur())

    expect(input).toHaveValue('External')
    expect(store.get(chatSettingsStateAtom).presets[0]).toMatchObject({ name: 'External' })
  })

  it.each(['Enter', 'Escape'])('resolves a dirty draft against an external rename with %s', key => {
    const { store, input, renameExternally, onRequestClose } = setup()
    fireEvent.change(input, { target: { value: 'Draft' } })
    renameExternally()
    expect(input).toHaveValue('Draft')
    fireEvent.keyDown(input, { key })

    const name = key === 'Enter' ? 'Draft' : 'External'
    expect(input).toHaveValue(name)
    expect(store.get(chatSettingsStateAtom).presets[0]).toMatchObject({ name })
    expect(onRequestClose).not.toHaveBeenCalled()
  })

  it('lets Escape close the modal from a read-only built-in preset name', () => {
    const store = createStore()
    store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)
    const onRequestClose = vi.fn()
    const view = renderWithStore(
      <Modal isOpen ariaLabel='Settings' shouldFocusAfterRender={false} onRequestClose={onRequestClose}>
        <PresetItem id='standard' reorder={reorder} />
      </Modal>,
      store,
    )
    fireEvent.keyDown(view.getByRole('textbox'), { key: 'Escape' })
    expect(onRequestClose).toHaveBeenCalledOnce()
  })
})
