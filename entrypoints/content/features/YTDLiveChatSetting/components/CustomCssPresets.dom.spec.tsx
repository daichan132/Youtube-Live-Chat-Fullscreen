import { act, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAT_CSS_PRESETS } from '@/shared/settings/chatCssPresets'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import {
  customCssAtom,
  customCssDraftAtom,
  customCssEditorUiAtom,
  customCssSuspendedAtom,
  savedChatCssAtom,
} from '@/shared/state/customCssAtoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { CustomCssSection } from './CustomCssSection'

const actions = vi.hoisted(() => ({ apply: vi.fn(), register: vi.fn(), remove: vi.fn(), disable: vi.fn(), suspend: vi.fn() }))
vi.mock('@/shared/runtime/AppProvider', () => ({ useOptionalAppRuntime: () => ({ customCss: actions }) }))

beforeEach(() => {
  for (const action of Object.values(actions)) action.mockReset().mockResolvedValue(undefined)
})

const makeStore = () => {
  const store = createTestStore()
  store.set(customCssEditorUiAtom, { name: '', registering: false, source: null, expanded: true })
  store.set(customCssSuspendedAtom, false)
  return store
}

const presetById = (id: string) => {
  const preset = CHAT_CSS_PRESETS.find(item => item.id === id)
  if (!preset) throw new Error(`Missing fixture preset: ${id}`)
  return preset
}

describe('starter CSS presets in the existing editor', () => {
  it.each(CHAT_CSS_PRESETS)('loads $id and its explanation without saving or resuming anything', preset => {
    const store = makeStore()
    const active = { enabled: true, css: '.existing{}' }
    const registrations = [{ id: 'mine', name: 'My CSS', css: '.mine{}' }]
    const appearance = store.get(chatSettingsStateAtom)
    store.set(customCssAtom, active)
    store.set(customCssSuspendedAtom, true)
    store.set(savedChatCssAtom, registrations)
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(view.getByLabelText('content.customCss.presets'), { target: { value: preset.id } })

    expect(view.getByLabelText('CSS')).toHaveValue(preset.css)
    expect(view.getByText(preset.descriptionKey)).toBeInTheDocument()
    if (preset.noteKey) expect(view.getByText(preset.noteKey)).toBeInTheDocument()
    expect(store.get(customCssAtom)).toBe(active)
    expect(store.get(savedChatCssAtom)).toBe(registrations)
    expect(store.get(chatSettingsStateAtom)).toBe(appearance)
    expect(store.get(customCssSuspendedAtom)).toBe(true)
    expect(store.get(customCssEditorUiAtom).name).toBe('')
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled()
  })

  it('preserves edited text and preset selection when replacing the source is cancelled', () => {
    const store = makeStore()
    const view = renderWithStore(<CustomCssSection />, store)
    const select = view.getByLabelText('content.customCss.presets')
    fireEvent.change(select, { target: { value: 'bubbles' } })
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '/* my changes */' } })
    fireEvent.change(select, { target: { value: 'cards' } })
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.cancel' }))
    expect(select).toHaveValue('bubbles')
    expect(view.getByLabelText('CSS')).toHaveValue('/* my changes */')
    expect(view.getByText('content.customCss.presetEdited')).toBeInTheDocument()
    expect(store.get(customCssAtom).css).toBe('')
  })

  it('reloads the packaged original only after confirmation and retains provenance across tab switches', () => {
    const store = makeStore()
    const first = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(first.getByLabelText('content.customCss.presets'), { target: { value: 'accent' } })
    fireEvent.change(first.getByLabelText('CSS'), { target: { value: '/* custom stripe */' } })
    first.unmount()
    const view = renderWithStore(<CustomCssSection />, store)
    expect(view.getByLabelText('content.customCss.presets')).toHaveValue('accent')
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.reloadPreset' }))
    expect(view.getByLabelText('CSS')).toHaveValue('/* custom stripe */')
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.replaceText' }))
    expect(view.getByLabelText('CSS')).toHaveValue(presetById('accent').css)
    expect(view.getByText('content.customCss.presetLoaded')).toBeInTheDocument()
    expect(actions.apply).not.toHaveBeenCalled()
  })

  it('names a personal copy only when asked to register, without applying it or modifying the original', async () => {
    const store = makeStore()
    const preset = presetById('bubbles')
    const original = preset.css
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(view.getByLabelText('content.customCss.presets'), { target: { value: preset.id } })
    expect(store.get(customCssEditorUiAtom).name).toBe('')
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '/* personal copy */' } })
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.register' }))
    expect(view.getByLabelText('content.customCss.name')).toHaveValue(preset.labelKey)
    fireEvent.change(view.getByLabelText('content.customCss.name'), { target: { value: 'My bubbles' } })
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'content.customCss.saveRegistration' }))
    })
    expect(actions.register).toHaveBeenCalledWith('My bubbles', '/* personal copy */')
    expect(actions.apply).not.toHaveBeenCalled()
    expect(preset.css).toBe(original)
  })

  it('keeps bundled and personal source IDs separate even if their text IDs happen to match', () => {
    const store = makeStore()
    store.set(savedChatCssAtom, [{ id: 'cards', name: 'My cards', css: '.mine{}' }])
    const view = renderWithStore(<CustomCssSection />, store)
    const presets = view.getByLabelText('content.customCss.presets')
    const registrations = view.getByRole('combobox', { name: /content.customCss.savedList/ })
    fireEvent.change(presets, { target: { value: 'cards' } })
    expect(view.queryByRole('button', { name: 'content.customCss.deleteSaved' })).not.toBeInTheDocument()
    fireEvent.change(registrations, { target: { value: 'cards' } })
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.replaceText' }))
    expect(presets).toHaveValue('')
    expect(registrations).toHaveValue('cards')
    expect(store.get(customCssDraftAtom)?.css).toBe('.mine{}')
    expect(store.get(customCssEditorUiAtom).source).toEqual({ kind: 'saved', id: 'cards' })
  })
})
