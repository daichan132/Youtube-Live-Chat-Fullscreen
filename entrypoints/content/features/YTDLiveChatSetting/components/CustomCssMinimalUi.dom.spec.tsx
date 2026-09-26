import { act, fireEvent, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  customCssAtom,
  customCssDraftAtom,
  customCssEditorUiAtom,
  customCssFeedbackAtom,
  customCssLocalStopAtom,
  customCssOperationAtom,
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

const setup = () => {
  const store = createTestStore()
  store.set(customCssEditorUiAtom, { name: '', registering: false, source: null, expanded: true })
  store.set(customCssSuspendedAtom, false)
  store.set(customCssAtom, { enabled: true, css: '.original{}' })
  const onKeyDown = vi.fn()
  const view = renderWithStore(<div onKeyDown={onKeyDown}><CustomCssSection /></div>, store)
  const main = view.container.querySelector<HTMLElement>('.ylc-custom-css-main-actions')
  const guide = view.container.querySelector<HTMLDetailsElement>('.ylc-custom-css-guide')
  if (!main || !guide) throw new Error('Missing CSS editor controls')
  return { store, view, onKeyDown, main, guide }
}

describe('minimal CSS editor', () => {
  it('keeps Apply, Save and Disable together and opens Save without performing a write', () => {
    const { view, main } = setup()
    expect(within(main).getAllByRole('button').map(button => button.textContent?.trim())).toEqual([
      'content.customCss.apply', 'content.customCss.register', 'content.customCss.disable',
    ])
    expect(view.queryByLabelText('content.customCss.name')).toBeNull()
    fireEvent.click(within(main).getByRole('button', { name: 'content.customCss.register' }))
    expect(view.getByLabelText('content.customCss.name')).toHaveFocus()
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled()
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.cancelRegistration' }))
    expect(view.queryByLabelText('content.customCss.name')).toBeNull()
    expect(view.getByLabelText('CSS')).toHaveValue('.original{}')
  })

  it('keeps trust warnings and preset details available without expanding them by default', () => {
    const { view, guide, store } = setup()
    expect(guide.open).toBe(false)
    expect(within(guide).getByText('content.customCss.warning')).toBeInTheDocument()
    fireEvent.change(view.getByLabelText('content.customCss.presets'), { target: { value: 'outline' } })
    const source = view.container.querySelector<HTMLDetailsElement>('.ylc-custom-css-source-info')
    expect(source?.open).toBe(false)
    expect(source).toHaveTextContent('content.customCss.presetOutlineNote')
    expect(store.get(customCssAtom)).toEqual({ enabled: true, css: '.original{}' })
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled()
  })

  it('does not change the editor session when nested help is toggled', () => {
    const { view, guide, store } = setup()
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.draft{}' } })
    const draft = store.get(customCssDraftAtom)
    const editorUi = store.get(customCssEditorUiAtom)
    for (const open of [true, false]) {
      guide.open = open
      fireEvent(guide, new Event('toggle', { bubbles: true }))
      expect(store.get(customCssEditorUiAtom)).toBe(editorUi)
      expect(store.get(customCssDraftAtom)).toBe(draft)
    }
    expect(view.container.querySelector('[data-ylc-custom-css]')).toHaveAttribute('open')
  })

  it.each(['guide', 'source-info'])('closes only %s on Escape, not during composition', kind => {
    const { view, store, onKeyDown } = setup()
    if (kind === 'source-info') {
      fireEvent.change(view.getByLabelText('content.customCss.presets'), { target: { value: 'cards' } })
    }
    const disclosure = view.container.querySelector<HTMLDetailsElement>(`.ylc-custom-css-${kind}`)
    const summary = disclosure?.querySelector('summary')
    if (!disclosure || !summary) throw new Error('Missing help disclosure')
    disclosure.open = true
    summary.focus()
    fireEvent.keyDown(summary, { key: 'Escape', isComposing: true })
    expect(disclosure.open).toBe(true)
    onKeyDown.mockClear()
    fireEvent.keyDown(summary, { key: 'Escape' })
    expect(disclosure.open).toBe(false)
    expect(summary).toHaveFocus()
    expect(store.get(customCssEditorUiAtom).expanded).toBe(true)
    expect(onKeyDown).not.toHaveBeenCalled()
  })

  it('keeps failure and external-change notices outside collapsed help', () => {
    const { store, view, guide } = setup()
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.draft{}' } })
    act(() => {
      store.set(customCssAtom, { enabled: true, css: '.external{}' })
      store.set(customCssFeedbackAtom, { kind: 'error', operation: 'apply', code: 'unconfirmed' })
    })
    const alert = view.getByRole('alert')
    expect(alert).toHaveTextContent('content.customCss.saveFailed')
    expect(guide.contains(alert)).toBe(false)
    expect(guide.contains(view.getByText('content.customCss.externalChange'))).toBe(false)
    expect(view.getByLabelText('CSS')).toHaveValue('.draft{}')
  })

  it('keeps saved-copy deletion out of the main row and requires confirmation', () => {
    const { store, view, main } = setup()
    act(() => { store.set(savedChatCssAtom, [{ id: 'mine', name: 'My CSS', css: '.saved{}' }]) })
    fireEvent.change(view.getByRole('combobox', { name: /content.customCss.savedList/ }), { target: { value: 'mine' } })
    const remove = view.getByRole('button', { name: 'content.customCss.deleteSaved' })
    expect(main.contains(remove)).toBe(false)
    fireEvent.click(remove)
    expect(actions.remove).not.toHaveBeenCalled()
    fireEvent.click(within(view.getByRole('group', { name: 'content.customCss.confirmTitle' }))
      .getByRole('button', { name: 'content.customCss.cancel' }))
    expect(view.getByLabelText('CSS')).toHaveValue('.saved{}')
    expect(store.get(customCssAtom)).toEqual({ enabled: true, css: '.original{}' })
  })

  it('distinguishes a confirmed pause from an unconfirmed stop in the main action', () => {
    const { store, main, view } = setup()
    act(() => { store.set(customCssSuspendedAtom, true) })
    expect(within(main).getByRole('button', { name: 'content.customCss.saveWhileStopped' })).toBeInTheDocument()
    act(() => {
      store.set(customCssSuspendedAtom, false)
      store.set(customCssLocalStopAtom, true)
    })
    expect(within(main).getByRole('button', { name: 'content.customCss.saveWithPendingStop' })).toBeInTheDocument()
    expect(view.getByText('content.customCss.stopUnconfirmed')).toBeInTheDocument()
    expect(actions.suspend).not.toHaveBeenCalled()
  })

  it('keeps emergency pause available and the editor copyable during an ordinary save', () => {
    const { store, view, main } = setup()
    act(() => { store.set(customCssOperationAtom, 'register') })
    for (const button of within(main).getAllByRole('button')) expect(button).toBeDisabled()
    expect(view.getByLabelText('CSS')).toHaveAttribute('readonly')
    expect(view.getByLabelText('CSS')).not.toBeDisabled()
    expect(view.getByRole('button', { name: 'content.customCss.stopAll' })).not.toBeDisabled()
  })
})
