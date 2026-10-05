import { fireEvent, type RenderResult, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { customCssAtom, customCssDraftAtom, customCssEditorUiAtom, savedChatCssAtom } from '@/shared/state/customCssAtoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { CustomCssSection } from './CustomCssSection'

const savedRow = (view: RenderResult, id: string) => {
  const row = view.container.querySelector<HTMLElement>(`[data-ylc-saved-css="${id}"]`)
  if (!row) throw new Error(`Missing saved style row: ${id}`)
  return within(row)
}

describe('always-visible CSS editing', () => {
  it('loads a sample without applying it or changing registered CSS', () => {
    const store = createTestStore()
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(view.getByRole('combobox'), { target: { value: 'preset:bubbles' } })
    expect(store.get(customCssDraftAtom)?.css).toContain('border-radius')
    expect(store.get(customCssAtom)).toEqual({ enabled: false, css: '' })
    expect(store.get(savedChatCssAtom)).toEqual([])
  })

  it('keeps draft text when the existing settings tab is unmounted and remounted', () => {
    const store = createTestStore()
    store.set(customCssEditorUiAtom, { name: '', registering: false, source: null })
    const first = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(first.getByLabelText('CSS'), { target: { value: 'body { color: red }' } })
    first.unmount()
    const second = renderWithStore(<CustomCssSection />, store)
    expect(second.getByLabelText('CSS')).toHaveValue('body { color: red }')
    expect(store.get(customCssAtom).css).toBe('')
  })

  it('cancelling a load preserves both text and the selected registration', () => {
    const store = createTestStore()
    store.set(savedChatCssAtom, [
      { id: 'first', name: 'First', css: '.first{}' },
      { id: 'second', name: 'Second', css: '.second{}' },
    ])
    const view = renderWithStore(<CustomCssSection />, store)
    fireEvent.click(savedRow(view, 'first').getByRole('button', { name: 'content.customCss.loadSaved' }))
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.edited{}' } })
    fireEvent.click(savedRow(view, 'second').getByRole('button', { name: 'content.customCss.loadSaved' }))
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.cancel' }))
    expect(view.getByLabelText('CSS')).toHaveValue(store.get(customCssDraftAtom)?.css)
    expect(store.get(customCssEditorUiAtom).source).toEqual({ kind: 'saved', id: 'first' })
    expect(store.get(customCssDraftAtom)?.css).toBe('.edited{}')
    expect(store.get(customCssAtom).css).toBe('')
  })

  it('retains the registration name and visible editor across tab remounts', () => {
    const store = createTestStore()
    store.set(customCssEditorUiAtom, { name: 'My draft', registering: true, source: null })
    const first = renderWithStore(<CustomCssSection />, store)
    fireEvent.change(first.getByLabelText('content.customCss.name'), { target: { value: 'Edited name' } })
    first.unmount()
    const second = renderWithStore(<CustomCssSection />, store)
    expect(second.getByLabelText('content.customCss.name')).toHaveValue('Edited name')
    expect(second.getByLabelText('CSS')).toBeInTheDocument()
    expect(store.get(savedChatCssAtom)).toEqual([])
  })
})
