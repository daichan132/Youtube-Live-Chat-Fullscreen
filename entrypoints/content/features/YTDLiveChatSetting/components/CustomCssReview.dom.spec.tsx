import { act, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { persistenceStatusAtom } from '@/shared/state/atoms'
import {
  customCssAtom,
  customCssDraftAtom,
  customCssEditorUiAtom,
  customCssFeedbackAtom,
  customCssLocalStopAtom,
  customCssOperationAtom,
  customCssSuspendedAtom,
  hasUnappliedCustomCssAtom,
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

const delayedRegistration = () => {
  let finish!: () => void
  actions.register.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
  return () => finish()
}

describe('CSS review regressions', () => {
  it('pins the displayed CSS while a registration without an existing draft is saving', async () => {
    const store = makeStore()
    store.set(customCssAtom, { enabled: true, css: '.original{}' })
    store.set(customCssEditorUiAtom, { name: 'Saved copy', registering: true, source: null, expanded: true })
    const finish = delayedRegistration()
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.saveRegistration' }))
    act(() => { store.set(customCssAtom, { enabled: true, css: '.external{}' }) })
    expect(view.getByLabelText('CSS')).toHaveValue('.original{}')
    expect(store.get(customCssDraftAtom)?.css).toBe('.original{}')
    await act(async () => { finish() })
    expect(actions.register).toHaveBeenCalledWith('Saved copy', '.original{}')
  })

  it('does not clear a new editor name when an older save with the same name completes', async () => {
    const store = makeStore()
    store.set(customCssAtom, { enabled: true, css: '.source{}' })
    store.set(customCssEditorUiAtom, { name: 'Same name', registering: true, source: null, expanded: true })
    const finish = delayedRegistration()
    const first = renderWithStore(<CustomCssSection />, store)
    fireEvent.click(first.getByRole('button', { name: 'content.customCss.saveRegistration' }))
    first.unmount()
    // Closing/discarding and later reopening creates a new editing object.
    store.set(customCssDraftAtom, null)
    store.set(customCssEditorUiAtom, { name: '', registering: false, source: null, expanded: true })
    store.set(customCssEditorUiAtom, { name: 'Same name', registering: true, source: null, expanded: true })
    const second = renderWithStore(<CustomCssSection />, store)
    await act(async () => { finish() })
    expect(second.getByLabelText('content.customCss.name')).toHaveValue('Same name')
  })

  it('clears a successfully saved name even if only the section was collapsed during the save', async () => {
    const store = makeStore()
    store.set(customCssAtom, { enabled: true, css: '.source{}' })
    store.set(customCssEditorUiAtom, { name: 'Saved name', registering: true, source: null, expanded: true })
    const finish = delayedRegistration()
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.saveRegistration' }))
    act(() => { store.set(customCssEditorUiAtom, current => ({ ...current, expanded: false })) })
    await act(async () => { finish() })
    expect(store.get(customCssEditorUiAtom).name).toBe('')
    expect(store.get(customCssEditorUiAtom).expanded).toBe(false)
  })

  it('keeps source text selectable while writes are pending', () => {
    const store = makeStore()
    store.set(customCssAtom, { enabled: true, css: '.copyable{}' })
    store.set(customCssOperationAtom, 'register')
    const view = renderWithStore(<CustomCssSection />, store)
    const editor = view.getByLabelText('CSS')
    expect(editor).toHaveAttribute('readonly')
    expect(editor).not.toBeDisabled()
    expect(view.getByLabelText('content.customCss.presets')).toBeDisabled()
    expect(view.getByRole('button', { name: 'content.customCss.stopAll' })).not.toBeDisabled()
  })

  it('can cancel a failed enabling write even when the confirmed state is already disabled', async () => {
    const store = makeStore()
    store.set(persistenceStatusAtom, { status: 'error', failedDomains: ['customCss'] })
    const view = renderWithStore(<CustomCssSection />, store)
    const disable = view.getByRole('button', { name: 'content.customCss.disable' })
    expect(disable).not.toBeDisabled()
    await act(async () => { fireEvent.click(disable) })
    expect(actions.disable).toHaveBeenCalledTimes(1)
  })

  it('cancels the inner confirmation on Escape without requesting that the settings page close', () => {
    const store = makeStore()
    const onKeyDown = vi.fn()
    const view = renderWithStore(<div onKeyDown={onKeyDown}><CustomCssSection /></div>, store)
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.myDraft{}' } })
    fireEvent.change(view.getByLabelText('content.customCss.presets'), { target: { value: 'bubbles' } })
    fireEvent.keyDown(view.getByRole('button', { name: 'content.customCss.cancel' }), { key: 'Escape' })
    expect(view.queryByRole('group', { name: 'content.customCss.confirmTitle' })).toBeNull()
    expect(view.getByLabelText('CSS')).toHaveFocus()
    expect(view.getByLabelText('CSS')).toHaveValue('.myDraft{}')
    expect(onKeyDown).not.toHaveBeenCalled()
  })

  it('shows the serialized-size error before applying a raw source below 64 KiB', () => {
    const store = makeStore()
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '\0'.repeat(48 * 1024) } })
    expect(view.getByRole('alert')).toHaveTextContent('content.customCss.tooLarge')
    expect(view.getByRole('button', { name: 'content.customCss.apply' })).toBeDisabled()
    expect(actions.apply).not.toHaveBeenCalled()
  })
})

describe('CSS editor usability', () => {
  it('reloads the selected registration without switching sources or changing applied CSS', () => {
    const store = makeStore()
    const active = { enabled: true, css: '.active{}' }
    const entries = [{ id: 'mine', name: 'My CSS', css: '.saved{}' }]
    store.set(customCssAtom, active)
    store.set(savedChatCssAtom, entries)
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(view.getByRole('combobox', { name: /content.customCss.savedList/ }), { target: { value: 'mine' } })
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.edited{}' } })
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.reloadSaved' }))
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.cancel' }))
    expect(view.getByLabelText('CSS')).toHaveValue('.edited{}')
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.reloadSaved' }))
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.replaceText' }))
    expect(view.getByLabelText('CSS')).toHaveValue('.saved{}')
    expect(view.getByText('content.customCss.savedLoaded')).toBeInTheDocument()
    expect(store.get(customCssAtom)).toBe(active)
    expect(store.get(savedChatCssAtom)).toBe(entries)
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled()
  })

  it('retains the loaded text when a selected registration is removed elsewhere', () => {
    const store = makeStore()
    store.set(savedChatCssAtom, [{ id: 'mine', name: 'My CSS', css: '.saved{}' }])
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(view.getByRole('combobox', { name: /content.customCss.savedList/ }), { target: { value: 'mine' } })
    act(() => { store.set(savedChatCssAtom, []) })
    expect(view.getByLabelText('CSS')).toHaveValue('.saved{}')
    expect(view.getByText('content.customCss.savedMissing')).toBeInTheDocument()
    expect(view.queryByRole('button', { name: 'content.customCss.deleteSaved' })).toBeNull()
  })

  it('explains duplicate trimmed names before writing and permits a different name', () => {
    const store = makeStore()
    store.set(customCssAtom, { enabled: true, css: '.source{}' })
    store.set(savedChatCssAtom, [{ id: 'mine', name: 'My CSS', css: '.saved{}' }])
    store.set(customCssEditorUiAtom, { name: '', registering: true, source: null, expanded: true })
    const view = renderWithStore(<CustomCssSection />, store)
    const input = view.getByLabelText('content.customCss.name')
    fireEvent.change(input, { target: { value: ' My CSS ' } })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(/content.customCss.duplicateName/)
    expect(view.getByRole('button', { name: 'content.customCss.saveRegistration' })).toBeDisabled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(actions.register).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: 'Another copy' } })
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(view.getByRole('button', { name: 'content.customCss.saveRegistration' })).not.toBeDisabled()
  })

  it('explains a full library without blocking editing or applying a new CSS source', () => {
    const store = makeStore()
    store.set(savedChatCssAtom, Array.from({ length: 20 }, (_, i) => ({ id: `css-${i}`, name: `CSS ${i}`, css: '.saved{}' })))
    store.set(customCssEditorUiAtom, { name: 'New CSS', registering: true, source: null, expanded: true })
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.new{}' } })
    expect(view.getByText('content.customCss.libraryFull')).toBeInTheDocument()
    expect(view.getByRole('button', { name: 'content.customCss.saveRegistration' })).toBeDisabled()
    expect(view.getByRole('button', { name: 'content.customCss.apply' })).not.toBeDisabled()
    expect(view.getByLabelText('CSS')).not.toHaveAttribute('readonly')
    expect(view.getByLabelText('content.customCss.name')).toHaveValue('New CSS')
  })

  it('cancels only the registration name, without discarding CSS or leaving a hidden unsaved-name warning', () => {
    const store = makeStore()
    store.set(customCssAtom, { enabled: true, css: '.kept{}' })
    store.set(customCssEditorUiAtom, { name: 'Not saved', registering: true, source: null, expanded: true })
    const view = renderWithStore(<CustomCssSection />, store)
    expect(store.get(hasUnappliedCustomCssAtom)).toBe(true)
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.cancelRegistration' }))
    expect(view.queryByLabelText('content.customCss.name')).toBeNull()
    expect(view.getByLabelText('CSS')).toHaveValue('.kept{}')
    expect(view.getByLabelText('CSS')).toHaveFocus()
    expect(store.get(hasUnappliedCustomCssAtom)).toBe(false)
    expect(actions.register).not.toHaveBeenCalled()
  })

  it('cancels registration with Escape, but not during IME composition', () => {
    const store = makeStore()
    store.set(customCssEditorUiAtom, { name: 'Draft', registering: true, source: null, expanded: true })
    const onKeyDown = vi.fn()
    const view = renderWithStore(<div onKeyDown={onKeyDown}><CustomCssSection /></div>, store)
    const input = view.getByLabelText('content.customCss.name')
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true })
    expect(view.getByLabelText('content.customCss.name')).toHaveValue('Draft')
    onKeyDown.mockClear()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(view.queryByLabelText('content.customCss.name')).toBeNull()
    expect(view.getByLabelText('CSS')).toHaveFocus()
    expect(onKeyDown).not.toHaveBeenCalled()
  })

  it('does not register CSS on modified Enter shortcuts in the name field', () => {
    const store = makeStore()
    store.set(customCssAtom, { enabled: true, css: '.source{}' })
    store.set(customCssEditorUiAtom, { name: 'Name', registering: true, source: null, expanded: true })
    const view = renderWithStore(<CustomCssSection />, store)
    const input = view.getByLabelText('content.customCss.name')
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
      fireEvent.keyDown(input, { key: 'Enter', [modifier]: true })
    }
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(actions.register).not.toHaveBeenCalled()
  })

  it('returns focus to the retained registration name after a failed write', async () => {
    const store = makeStore()
    store.set(customCssAtom, { enabled: true, css: '.source{}' })
    store.set(customCssEditorUiAtom, { name: 'Keep name', registering: true, source: null, expanded: true })
    let rejectSave!: (error: Error) => void
    actions.register.mockImplementationOnce(() => {
      store.set(customCssOperationAtom, 'register')
      return new Promise<void>((_resolve, reject) => { rejectSave = reject }).catch(error => {
        store.set(customCssFeedbackAtom, { kind: 'error', operation: 'register', code: 'storage' })
        store.set(customCssOperationAtom, null)
        throw error
      })
    })
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.saveRegistration' }))
    await act(async () => { rejectSave(new Error('Storage unavailable')) })
    expect(view.getByLabelText('content.customCss.name')).toHaveValue('Keep name')
    expect(view.getByLabelText('content.customCss.name')).toHaveFocus()
    expect(view.getByLabelText('CSS')).toHaveValue('.source{}')
    expect(view.getByRole('alert')).toHaveTextContent('content.customCss.saveFailed')
  })

  it('distinguishes saved-but-disabled, paused and unconfirmed pause states', () => {
    const store = makeStore()
    store.set(customCssAtom, { enabled: false, css: '.source{}' })
    const view = renderWithStore(<CustomCssSection />, store)
    expect(view.getByText('content.customCss.savedButDisabled')).toBeInTheDocument()
    act(() => { store.set(customCssSuspendedAtom, true) })
    expect(view.getByText('content.customCss.savedButPaused')).toBeInTheDocument()
    act(() => {
      store.set(customCssSuspendedAtom, false)
      store.set(customCssLocalStopAtom, true)
    })
    expect(view.queryByText('content.customCss.savedButPaused')).toBeNull()
    expect(view.getByText('content.customCss.pausePendingState')).toBeInTheDocument()
  })

  it('surfaces a changed saved state without overwriting the draft or silently applying it', () => {
    const store = makeStore()
    store.set(customCssAtom, { enabled: true, css: '.original{}' })
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.draft{}' } })
    act(() => { store.set(customCssAtom, { enabled: true, css: '.external{}' }) })
    expect(view.getByText('content.customCss.externalChange')).toBeInTheDocument()
    expect(view.getByLabelText('CSS')).toHaveValue('.draft{}')
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.apply' }))
    expect(view.getByRole('group', { name: 'content.customCss.confirmTitle' })).toBeInTheDocument()
    expect(actions.apply).not.toHaveBeenCalled()
  })
})
