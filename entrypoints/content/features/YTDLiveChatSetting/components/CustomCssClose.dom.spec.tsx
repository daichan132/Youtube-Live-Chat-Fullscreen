import { fireEvent } from '@testing-library/react'
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
