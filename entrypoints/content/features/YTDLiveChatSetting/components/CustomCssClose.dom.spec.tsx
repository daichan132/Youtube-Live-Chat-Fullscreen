import { act, fireEvent } from '@testing-library/react'
import { Provider } from 'jotai'
import { describe, expect, it, vi } from 'vitest'
import { customCssAtom, customCssDraftAtom, customCssEditorUiAtom, customCssOperationAtom } from '@/shared/state/customCssAtoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { YTDLiveChatSetting } from './YTDLiveChatSetting'

describe('closing the CSS editor', () => {
  it('allows explicitly closing during a pending save without cancelling that save', () => {
    const store = createTestStore()
    store.set(customCssOperationAtom, 'apply')
    store.set(customCssEditorUiAtom, { name: '', registering: false, source: { kind: 'preset', id: 'bubbles' }, expanded: true })
    store.set(customCssDraftAtom, { css: '.draft{}', baseline: { enabled: false, css: '' } })
    const onOpenChange = vi.fn()
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={onOpenChange} />, store)
    const close = view.getByRole('button', { name: 'content.aria.close' })
    expect(close).not.toBeDisabled()
    fireEvent.click(close)
    expect(onOpenChange).not.toHaveBeenCalled()
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.closeAnyway' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(store.get(customCssDraftAtom)).toBeNull()
    expect(store.get(customCssEditorUiAtom).source).toBeNull()
    expect(store.get(customCssOperationAtom)).toBe('apply')
  })

  it('preserves CSS and the unsaved registration name when close is cancelled', () => {
    const store = createTestStore()
    store.set(customCssDraftAtom, { css: '.draft{}', baseline: { enabled: false, css: '' } })
    store.set(customCssEditorUiAtom, { name: 'My CSS', registering: true, source: null, expanded: true })
    const onOpenChange = vi.fn()
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={onOpenChange} />, store)
    fireEvent.click(view.getByRole('button', { name: 'content.aria.close' }))
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.keepEditing' }))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(store.get(customCssDraftAtom)?.css).toBe('.draft{}')
    expect(store.get(customCssEditorUiAtom).name).toBe('My CSS')
    expect(store.get(customCssAtom)).toEqual({ enabled: false, css: '' })
  })
})

describe('cancelling the settings close confirmation', () => {
  it('dismisses only the confirmation on Escape and returns focus to the editor', () => {
    const store = createTestStore()
    store.set(customCssEditorUiAtom, { name: 'Keep', registering: false, source: null, expanded: true })
    store.set(customCssDraftAtom, { css: '.draft{}', baseline: { enabled: false, css: '' } })
    const onOpenChange = vi.fn()
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={onOpenChange} />, store)
    const editor = view.getByLabelText('CSS')
    editor.focus()
    fireEvent.keyDown(editor, { key: 'Escape' })
    const keepEditing = view.getByRole('button', { name: 'content.customCss.keepEditing' })
    expect(keepEditing).toHaveFocus()
    fireEvent.keyDown(keepEditing, { key: 'Escape', isComposing: true })
    expect(keepEditing).toBeInTheDocument()
    fireEvent.keyDown(keepEditing, { key: 'Escape' })
    expect(view.queryByRole('button', { name: 'content.customCss.keepEditing' })).toBeNull()
    expect(editor).toHaveFocus()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(store.get(customCssDraftAtom)?.css).toBe('.draft{}')
    expect(store.get(customCssEditorUiAtom).name).toBe('Keep')
  })

  it('does not close Settings on Escape just because a pending save finished', () => {
    const store = createTestStore()
    store.set(customCssOperationAtom, 'apply')
    const onOpenChange = vi.fn()
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={onOpenChange} />, store)
    fireEvent.click(view.getByRole('button', { name: 'content.aria.close' }))
    act(() => { store.set(customCssOperationAtom, null) })
    fireEvent.keyDown(view.getByRole('button', { name: 'content.customCss.keepEditing' }), { key: 'Escape' })
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(view.queryByRole('button', { name: 'content.customCss.keepEditing' })).toBeNull()
  })

  it('does not retain an old confirmation when the parent closes and reopens Settings', () => {
    const store = createTestStore()
    store.set(customCssDraftAtom, { css: '.draft{}', baseline: { enabled: false, css: '' } })
    const onOpenChange = vi.fn()
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={onOpenChange} />, store)
    fireEvent.click(view.getByRole('button', { name: 'content.aria.close' }))
    view.rerender(<Provider store={store}><YTDLiveChatSetting open={false} onOpenChange={onOpenChange} /></Provider>)
    view.rerender(<Provider store={store}><YTDLiveChatSetting open onOpenChange={onOpenChange} /></Provider>)
    expect(view.queryByRole('button', { name: 'content.customCss.keepEditing' })).toBeNull()
    expect(store.get(customCssDraftAtom)?.css).toBe('.draft{}')
  })
})
