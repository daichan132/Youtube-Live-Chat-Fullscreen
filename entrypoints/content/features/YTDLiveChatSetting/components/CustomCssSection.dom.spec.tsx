import { fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { customCssAtom, customCssDraftAtom, customCssEditorUiAtom, savedChatCssAtom } from '@/shared/state/customCssAtoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { CustomCssSection } from './CustomCssSection'

describe('additive custom CSS editor', () => {
  it('loads a sample without applying it or changing registered CSS', () => {
    const store = createTestStore()
    store.set(customCssEditorUiAtom, { name: '', registering: false, source: null, expanded: true })
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(view.getByLabelText('content.customCss.presets'), { target: { value: 'bubbles' } })
    expect(store.get(customCssDraftAtom)?.css).toContain('border-radius')
    expect(store.get(customCssAtom)).toEqual({ enabled: false, css: '' })
    expect(store.get(savedChatCssAtom)).toEqual([])
  })
  it('keeps draft text when the existing settings tab is unmounted and remounted', () => {
    const store = createTestStore()
    store.set(customCssEditorUiAtom, { name: '', registering: false, source: null, expanded: true })
    const first = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(first.getByLabelText('CSS'), { target: { value: 'body { color: red }' } })
    first.unmount()
    const second = renderWithStore(<CustomCssSection />, store)
    expect(second.getByLabelText('CSS')).toHaveValue('body { color: red }')
    expect(store.get(customCssAtom).css).toBe('')
  })
})

it('cancelling a load preserves both text and the selected registration', () => {
  const store = createTestStore()
    store.set(customCssEditorUiAtom, { name: '', registering: false, source: null, expanded: true })
  store.set(savedChatCssAtom, [
    { id: 'first', name: 'First', css: '.first{}' },
    { id: 'second', name: 'Second', css: '.second{}' },
  ])
  const view = renderWithStore(<CustomCssSection />, store)
  const select = view.getByRole('combobox', { name: /content.customCss.savedList/ })
  fireEvent.change(select, { target: { value: 'first' } })
  fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.edited{}' } })
  fireEvent.change(select, { target: { value: 'second' } })
  fireEvent.click(view.getByRole('button', { name: 'content.customCss.cancel' }))
  expect(select).toHaveValue('first')
  expect(view.getByLabelText('CSS')).toHaveValue('.edited{}')
  expect(store.get(customCssAtom).css).toBe('')
})

it('retains the registration name and editor expansion across tab remounts', () => {
  const store = createTestStore()
  store.set(customCssEditorUiAtom, { name: 'My draft', registering: true, source: null, expanded: true })
  const first = renderWithStore(<CustomCssSection />, store)
  fireEvent.change(first.getByLabelText('content.customCss.name'), { target: { value: 'Edited name' } })
  first.unmount()
  const second = renderWithStore(<CustomCssSection />, store)
  expect(second.getByLabelText('content.customCss.name')).toHaveValue('Edited name')
  expect(second.container.querySelector('details')).toHaveAttribute('open')
  expect(store.get(savedChatCssAtom)).toEqual([])
})
