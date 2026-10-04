import { act, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { persistenceStatusAtom } from '@/shared/state/atoms'
import { customCssAtom, customCssDraftAtom, customCssEditorUiAtom, customCssSuspendedAtom } from '@/shared/state/customCssAtoms'
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
  store.set(customCssEditorUiAtom, { name: '', registering: false, source: null, expanded: true })
  store.set(customCssSuspendedAtom, false)
  store.set(customCssAtom, { enabled: true, css: '.original{}' })
  return { store, view: renderWithStore(<CustomCssSection />, store) }
}

describe('CSS Use and Off transitions', () => {
  it('can reaffirm unchanged CSS when a previous source write failed', async () => {
    const { store, view } = setup()
    act(() => {
      store.set(persistenceStatusAtom, { status: 'error', failedDomains: ['customCss'] })
    })
    const apply = view.getByRole('button', { name: 'content.customCss.apply' })
    expect(apply).not.toBeDisabled()
    await act(async () => {
      fireEvent.click(apply)
    })
    expect(actions.activate).toHaveBeenCalledWith('.original{}', { enabled: true, css: '.original{}' })
  })

  it('does not enable unchanged Use for failures in unrelated domains', () => {
    const { store, view } = setup()
    act(() => {
      store.set(persistenceStatusAtom, { status: 'error', failedDomains: ['savedChatCss'] })
    })
    expect(view.container.querySelector('[data-ylc-css-use]')).toBeDisabled()
  })

  it('pins the visible source while Off is pending and preserves it across an external update', async () => {
    const { store, view } = setup()
    let finish!: () => void
    actions.suspend.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finish = resolve
        }),
    )
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.disable' }))
    act(() => {
      store.set(customCssAtom, { enabled: true, css: '.external{}' })
    })
    expect(view.getByLabelText('CSS')).toHaveValue('.original{}')
    await act(async () => {
      finish()
    })
    expect(view.getByLabelText('CSS')).toHaveValue('.original{}')
    expect(view.getByText('content.customCss.externalChange')).toBeInTheDocument()
    expect(actions.disable).not.toHaveBeenCalled()
  })

  it('does not treat its own confirmed Off as an external source conflict', async () => {
    const { store, view } = setup()
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.draft{}' } })
    actions.suspend.mockImplementationOnce(async () => {
      store.set(customCssSuspendedAtom, true)
    })
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'content.customCss.disable' }))
    })
    expect(view.getByLabelText('CSS')).toHaveValue('.draft{}')
    expect(view.queryByText('content.customCss.externalChange')).toBeNull()
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'content.customCss.resume' }))
    })
    expect(actions.activate).toHaveBeenCalledWith('.draft{}', { enabled: true, css: '.original{}' })
  })

  it('preserves a pre-existing editing conflict after Off', async () => {
    const { store, view } = setup()
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.draft{}' } })
    act(() => {
      store.set(customCssAtom, { enabled: true, css: '.external{}' })
    })
    actions.suspend.mockImplementationOnce(async () => {
      store.set(customCssSuspendedAtom, true)
    })
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'content.customCss.disable' }))
    })
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.resume' }))
    expect(actions.activate).not.toHaveBeenCalled()
    expect(view.getByRole('group', { name: 'content.customCss.confirmTitle' })).toBeInTheDocument()
    expect(view.getByLabelText('CSS')).toHaveValue('.draft{}')
  })

  it('does not overwrite a later draft when an older Use finishes', async () => {
    const { store, view } = setup()
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.submitted{}' } })
    let finish!: () => void
    actions.activate.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finish = resolve
        }),
    )
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.apply' }))
    const next = { css: '.next{}', baseline: { enabled: false, css: '.different{}' } }
    act(() => {
      store.set(customCssDraftAtom, next)
    })
    await act(async () => {
      store.set(customCssAtom, { enabled: true, css: '.submitted{}' })
      finish()
    })
    expect(store.get(customCssDraftAtom)).toBe(next)
  })

  it('advances the baseline after the source was saved even if the subsequent resume failed', async () => {
    const { store, view } = setup()
    act(() => {
      store.set(customCssSuspendedAtom, true)
    })
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.submitted{}' } })
    actions.activate.mockImplementationOnce(async () => {
      store.set(customCssAtom, { enabled: true, css: '.submitted{}' })
      throw new Error('Resume failed')
    })
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'content.customCss.resume' }))
    })
    expect(view.getByLabelText('CSS')).toHaveValue('.submitted{}')
    expect(view.queryByText('content.customCss.externalChange')).toBeNull()
    expect(view.getByRole('button', { name: 'content.customCss.resume' })).not.toBeDisabled()
  })
})
