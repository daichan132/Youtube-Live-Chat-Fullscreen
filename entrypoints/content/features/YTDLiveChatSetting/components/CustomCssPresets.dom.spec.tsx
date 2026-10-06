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
  const library = view.container.querySelector<HTMLDetailsElement>('details.ylc-custom-css-library')
  const summary = library?.querySelector('summary')
  if (library && !library.open && summary) fireEvent.click(summary)
  const row = view.container.querySelector<HTMLElement>(`[data-ylc-saved-css="${id}"]`)
  if (!row) throw new Error(`Missing saved style row: ${id}`)
  return within(row)
}

const choosePreset = (view: RenderResult, id: string) => {
  const chooser = view.getByRole('button', { name: 'content.customCss.choosePreset' })
  if (chooser.getAttribute('aria-expanded') !== 'true') fireEvent.click(chooser)
  const choice = view.container.querySelector(`[data-ylc-css-preset-choice="${id}"]`)
  if (!choice) throw new Error(`Missing preset choice: ${id}`)
  fireEvent.click(choice)
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
    choosePreset(view, preset.id)
    const preview = view.container.querySelector(`[data-ylc-css-preview="${preset.id}"]`)
    expect(preview).toHaveAttribute('sandbox', '')
    expect(preview).toHaveAttribute('srcdoc', expect.stringContaining(preset.css))
    expect(view.container.querySelector('style')).toBeNull()
    expect(view.getByLabelText('CSS')).toBeVisible()
    expect(view.getByLabelText('CSS')).toHaveValue(preset.css)
    expect(store.get(customCssAtom)).toBe(active)
    expect(store.get(savedChatCssAtom)).toBe(copies)
    expect(store.get(chatSettingsStateAtom)).toBe(appearance)
    expect(store.get(customCssSuspendedAtom)).toBe(true)
    expect(store.get(customCssEditorUiAtom).name).toBe('')
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled()
  })

  it('shows visual choices before selection and loads a card without applying it', () => {
    const store = createTestStore()
    const view = renderWithStore(<CustomCssSection />, store)
    const chooser = view.getByRole('button', { name: 'content.customCss.choosePreset' })
    expect(chooser).toHaveAttribute('aria-expanded', 'false')
    expect(view.container.querySelector('[data-ylc-css-preset-choice]')).toBeNull()
    expect(view.getByLabelText('CSS')).toHaveValue('')
    fireEvent.click(chooser)
    expect(chooser).toHaveAttribute('aria-expanded', 'true')
    expect(view.container.querySelectorAll('[data-ylc-css-preset-choice]')).toHaveLength(CHAT_CSS_PRESETS.length)
    expect(view.getByLabelText('CSS')).toBeVisible()
    const preset = presetById('messenger')
    const choice = view.container.querySelector('[data-ylc-css-preset-choice="messenger"]')
    if (!choice) throw new Error('Missing messenger choice')
    fireEvent.click(choice)
    expect(view.getByLabelText('CSS')).toHaveValue(preset.css)
    expect(view.container.querySelector('[data-ylc-css-preview="messenger"]')).toBeInTheDocument()
    expect(chooser).toHaveAttribute('aria-expanded', 'false')
    expect(view.container.querySelector('[data-ylc-css-preset-choice]')).toBeNull()
    expect(view.getByLabelText('CSS')).toHaveFocus()
    expect(store.get(customCssAtom)).toEqual({ enabled: false, css: '' })
    expect(store.get(savedChatCssAtom)).toEqual([])
    expect(actions.activate).not.toHaveBeenCalled()
  })

  it('removes the executable preview when a packaged source is edited', () => {
    const store = createTestStore()
    const view = renderWithStore(<CustomCssSection />, store)
    choosePreset(view, 'messenger')
    expect(view.container.querySelector('[data-ylc-css-preview="messenger"]')).toBeInTheDocument()
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: 'body { background: url(https://example.invalid/private); }' } })
    expect(view.container.querySelector('[data-ylc-css-preview]')).toBeNull()
    expect(view.container.querySelector('style')).toBeNull()
    expect(actions.activate).not.toHaveBeenCalled()
  })

  it('does not ask to discard a recoverable starter when choosing another starter', () => {
    const store = createTestStore()
    const view = renderWithStore(<CustomCssSection />, store)
    for (const id of ['bubbles', 'cards', 'accent']) {
      choosePreset(view, id)
      expect(view.queryByRole('group', { name: 'content.customCss.confirmTitle' })).toBeNull()
      expect(store.get(customCssDraftAtom)?.css).toBe(presetById(id).css)
    }
    expect(actions.activate).not.toHaveBeenCalled()
  })

  it('keeps genuine edits and provenance when a source replacement is cancelled', () => {
    const store = createTestStore()
    const view = renderWithStore(<CustomCssSection />, store)
    choosePreset(view, 'bubbles')
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '/* my changes */' } })
    choosePreset(view, 'cards')
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.cancel' }))
    expect(view.getByLabelText('CSS')).toHaveValue(store.get(customCssDraftAtom)?.css)
    expect(store.get(customCssEditorUiAtom).source).toEqual({ kind: 'preset', id: 'bubbles' })
    expect(view.getByLabelText('CSS')).toHaveValue('/* my changes */')
    expect(store.get(customCssAtom).css).toBe('')
    const chooser = view.getByRole('button', { name: 'content.customCss.choosePreset' })
    expect(chooser).toHaveAttribute('aria-expanded', 'true')
    expect(view.getByLabelText('CSS')).toHaveFocus()
    fireEvent.keyDown(view.getByLabelText('CSS'), { key: 'Escape' })
    expect(chooser).toHaveAttribute('aria-expanded', 'false')
    expect(chooser).toHaveFocus()
    choosePreset(view, 'cards')
    expect(view.getByRole('group', { name: 'content.customCss.confirmTitle' })).toBeInTheDocument()
    expect(view.getByLabelText('CSS')).toHaveValue('/* my changes */')
    expect(actions.activate).not.toHaveBeenCalled()
  })

  it('reloads the packaged original only after confirmation and retains the draft across tabs', () => {
    const store = createTestStore()
    const first = renderWithStore(<CustomCssSection />, store)
    choosePreset(first, 'accent')
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
    choosePreset(view, preset.id)
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
    choosePreset(view, 'cards')
    expect(view.getByLabelText('CSS')).toHaveValue(presetById('cards').css)
    expect(store.get(customCssEditorUiAtom).source).toEqual({ kind: 'preset', id: 'cards' })
    expect(view.queryByRole('combobox')).toBeNull()
    fireEvent.click(savedRow(view, 'cards').getByRole('button', { name: 'content.customCss.loadSaved' }))
    expect(view.getByLabelText('CSS')).toHaveValue('.mine{}')
    expect(store.get(customCssDraftAtom)?.css).toBe('.mine{}')
    expect(store.get(customCssEditorUiAtom).source).toEqual({ kind: 'saved', id: 'cards' })
    expect(view.queryByRole('group', { name: 'content.customCss.confirmTitle' })).toBeNull()
    expect(actions.activate).not.toHaveBeenCalled()
  })
})
