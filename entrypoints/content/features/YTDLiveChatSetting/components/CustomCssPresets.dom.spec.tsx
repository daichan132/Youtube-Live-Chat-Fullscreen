import { act, fireEvent, type RenderResult, within } from '@testing-library/react'
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

const actions = vi.hoisted(() => ({
  activate: vi.fn(),
  apply: vi.fn(),
  register: vi.fn(),
  remove: vi.fn(),
  disable: vi.fn(),
  suspend: vi.fn(),
}))
vi.mock('@/shared/runtime/AppProvider', () => ({ useOptionalAppRuntime: () => ({ customCss: actions }) }))
beforeEach(() => {
  for (const action of Object.values(actions)) action.mockReset().mockResolvedValue(undefined)
})
const presetById = (id: string) => {
  const preset = CHAT_CSS_PRESETS.find(item => item.id === id)
  if (!preset) throw new Error(`Missing fixture preset: ${id}`)
  return preset
}

const savedRow = (view: RenderResult, id: string) => {
  const row = view.container.querySelector<HTMLElement>(`[data-ylc-saved-css="${id}"]`)
  if (!row) throw new Error(`Missing saved style row: ${id}`)
  return within(row)
}

describe('choosing recommended and saved CSS styles', () => {
  it.each(CHAT_CSS_PRESETS)('loads $id and its example without saving, applying or resuming', preset => {
    const store = createTestStore()
    const active = { enabled: true, css: '.existing{}' }
    const copies = [{ id: 'mine', name: 'My CSS', css: '.mine{}' }]
    const appearance = store.get(chatSettingsStateAtom)
    store.set(customCssAtom, active)
    store.set(savedChatCssAtom, copies)
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(view.getByRole('combobox'), { target: { value: `preset:${preset.id}` } })
    expect(view.getByText(preset.descriptionKey)).toBeVisible()
    const illustration = view.container.querySelector('[data-ylc-css-example]')
    expect(illustration).toHaveAttribute('data-ylc-css-example', preset.id)
    expect(illustration?.querySelectorAll('.ylc-css-example-message')).toHaveLength(3)
    expect(illustration?.querySelector('style, script, iframe')).toBeNull()
    if (preset.noteKey) expect(view.getByText(preset.noteKey)).toBeInTheDocument()
    expect(view.getByLabelText('CSS')).toBeVisible()
    expect(view.getByLabelText('CSS')).toHaveValue(preset.css)
    expect(store.get(customCssAtom)).toBe(active)
    expect(store.get(savedChatCssAtom)).toBe(copies)
    expect(store.get(chatSettingsStateAtom)).toBe(appearance)
    expect(store.get(customCssSuspendedAtom)).toBe(true)
    expect(store.get(customCssEditorUiAtom).name).toBe('')
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled()
  })

  it('does not ask to discard a recoverable starter when choosing another starter', () => {
    const store = createTestStore()
    const view = renderWithStore(<CustomCssSection />, store)
    for (const id of ['bubbles', 'cards', 'accent']) {
      fireEvent.change(view.getByRole('combobox'), { target: { value: `preset:${id}` } })
      expect(view.queryByRole('group', { name: 'content.customCss.confirmTitle' })).toBeNull()
      expect(store.get(customCssDraftAtom)?.css).toBe(presetById(id).css)
    }
    expect(actions.activate).not.toHaveBeenCalled()
  })

  it('keeps genuine edits and provenance when a source replacement is cancelled', () => {
    const store = createTestStore()
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(view.getByRole('combobox'), { target: { value: 'preset:bubbles' } })
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '/* my changes */' } })
    fireEvent.change(view.getByRole('combobox'), { target: { value: 'preset:cards' } })
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.cancel' }))
    expect(view.getByLabelText('CSS')).toHaveValue(store.get(customCssDraftAtom)?.css)
    expect(store.get(customCssEditorUiAtom).source).toEqual({ kind: 'preset', id: 'bubbles' })
    expect(view.getByLabelText('CSS')).toHaveValue('/* my changes */')
    expect(store.get(customCssAtom).css).toBe('')
  })

  it('reloads the packaged original only after confirmation and retains the draft across tabs', () => {
    const store = createTestStore()
    const first = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(first.getByRole('combobox'), { target: { value: 'preset:accent' } })
    fireEvent.change(first.getByLabelText('CSS'), { target: { value: '/* custom stripe */' } })
    first.unmount()
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.reloadPreset' }))
    expect(view.getByLabelText('CSS')).toHaveValue('/* custom stripe */')
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.replaceText' }))
    expect(view.getByLabelText('CSS')).toHaveValue(presetById('accent').css)
    expect(actions.activate).not.toHaveBeenCalled()
  })

  it('names a personal copy only when asked, without applying it or modifying the original', async () => {
    const store = createTestStore()
    const preset = presetById('bubbles')
    const original = preset.css
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(view.getByRole('combobox'), { target: { value: `preset:${preset.id}` } })
    expect(store.get(customCssEditorUiAtom).name).toBe('')
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '/* personal copy */' } })
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.register' }))
    expect(view.getByLabelText('content.customCss.name')).toHaveValue(preset.labelKey)
    fireEvent.change(view.getByLabelText('content.customCss.name'), { target: { value: 'My bubbles' } })
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'content.customCss.saveRegistration' }))
    })
    expect(actions.register).toHaveBeenCalledWith('My bubbles', '/* personal copy */')
    expect(actions.activate).not.toHaveBeenCalled()
    expect(preset.css).toBe(original)
  })

  it('distinguishes recommended and saved styles that share an ID', () => {
    const store = createTestStore()
    store.set(savedChatCssAtom, [{ id: 'cards', name: 'My cards', css: '.mine{}' }])
    const view = renderWithStore(<CustomCssSection />, store)
    const select = view.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'preset:cards' } })
    expect(view.getByLabelText('CSS')).toHaveValue(presetById('cards').css)
    expect(store.get(customCssEditorUiAtom).source).toEqual({ kind: 'preset', id: 'cards' })
    expect(within(select).queryByRole('option', { name: 'My cards' })).toBeNull()
    fireEvent.click(savedRow(view, 'cards').getByRole('button', { name: 'content.customCss.loadSaved' }))
    expect(view.getByLabelText('CSS')).toHaveValue('.mine{}')
    expect(store.get(customCssDraftAtom)?.css).toBe('.mine{}')
    expect(store.get(customCssEditorUiAtom).source).toEqual({ kind: 'saved', id: 'cards' })
    expect(view.queryByRole('group', { name: 'content.customCss.confirmTitle' })).toBeNull()
    expect(actions.activate).not.toHaveBeenCalled()
  })
})
