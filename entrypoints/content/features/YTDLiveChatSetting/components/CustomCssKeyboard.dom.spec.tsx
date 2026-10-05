import { act, fireEvent, type RenderResult, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { customCssDraftAtom, customCssEditorUiAtom, customCssOperationAtom, savedChatCssAtom } from '@/shared/state/customCssAtoms'
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

const setup = () => {
  const store = createTestStore()
  store.set(customCssDraftAtom, { css: '.draft{}', baseline: { enabled: false, css: '' } })
  store.set(customCssEditorUiAtom, { name: 'Copy', registering: true, source: null })
  const onKeyDown = vi.fn()
  const view = renderWithStore(
    // biome-ignore lint/a11y/noStaticElementInteractions: Test-only wrapper observes keyboard event bubbling from child controls.
    <div onKeyDown={onKeyDown}>
      <CustomCssSection />
    </div>,
    store,
  )
  return { store, view, onKeyDown }
}

const savedRow = (view: RenderResult, id: string) => {
  const row = view.container.querySelector<HTMLElement>(`[data-ylc-saved-css="${id}"]`)
  if (!row) throw new Error(`Missing saved style row: ${id}`)
  return within(row)
}

describe('innermost CSS keyboard dismissal', () => {
  it.each(['name', 'editor', 'save', 'cancel'])('cancels only named saving when Escape starts on %s', target => {
    const { store, view, onKeyDown } = setup()
    const control =
      target === 'name'
        ? view.getByLabelText('content.customCss.name')
        : target === 'editor'
          ? view.getByLabelText('CSS')
          : view.getByRole('button', {
              name: target === 'save' ? 'content.customCss.saveRegistration' : 'content.customCss.cancelRegistration',
            })
    control.focus()
    fireEvent.keyDown(control, { key: 'Escape' })
    expect(view.queryByLabelText('content.customCss.name')).toBeNull()
    expect(view.getByLabelText('CSS')).toHaveFocus()
    expect(store.get(customCssDraftAtom)?.css).toBe('.draft{}')
    expect(view.getByLabelText('CSS')).toBeVisible()
    expect(onKeyDown).not.toHaveBeenCalled()
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled()
  })

  it.each(['name', 'editor'])('does not bubble Escape from a read-only %s during saving', target => {
    const { store, view, onKeyDown } = setup()
    act(() => {
      store.set(customCssOperationAtom, 'register')
    })
    const control = view.getByLabelText(target === 'name' ? 'content.customCss.name' : 'CSS')
    control.focus()
    fireEvent.keyDown(control, { key: 'Escape' })
    expect(view.getByLabelText('content.customCss.name')).toHaveValue('Copy')
    expect(view.getByLabelText('CSS')).toHaveValue('.draft{}')
    expect(control).toHaveFocus()
    expect(onKeyDown).not.toHaveBeenCalled()
  })

  it('dismisses a deletion confirmation before the name form even when the name input has focus', () => {
    const { store, view, onKeyDown } = setup()
    act(() => {
      store.set(savedChatCssAtom, [{ id: 'mine', name: 'Saved', css: '.draft{}' }])
      store.set(customCssEditorUiAtom, current => ({ ...current, source: { kind: 'saved', id: 'mine' } }))
    })
    fireEvent.click(savedRow(view, 'mine').getByRole('button', { name: 'content.customCss.deleteSavedLabel' }))
    const input = view.getByLabelText('content.customCss.name')
    input.focus()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(view.queryByRole('group', { name: 'content.customCss.confirmTitle' })).toBeNull()
    expect(input).toHaveValue('Copy')
    expect(view.getByLabelText('CSS')).toHaveFocus()
    expect(actions.remove).not.toHaveBeenCalled()
    expect(onKeyDown).not.toHaveBeenCalled()
  })

  it('leaves the name form intact on composing Escape', () => {
    const { store, view } = setup()
    fireEvent.keyDown(view.getByLabelText('content.customCss.name'), { key: 'Escape', isComposing: true })
    expect(store.get(customCssEditorUiAtom)).toMatchObject({ name: 'Copy', registering: true })
    expect(actions.register).not.toHaveBeenCalled()
  })

  it('still saves the named copy on plain Enter without applying it', async () => {
    const { view, onKeyDown } = setup()
    await act(async () => {
      fireEvent.keyDown(view.getByLabelText('content.customCss.name'), { key: 'Enter' })
    })
    expect(actions.register).toHaveBeenCalledWith('Copy', '.draft{}')
    expect(actions.activate).not.toHaveBeenCalled()
    expect(actions.apply).not.toHaveBeenCalled()
    expect(onKeyDown).not.toHaveBeenCalled()
  })
})
