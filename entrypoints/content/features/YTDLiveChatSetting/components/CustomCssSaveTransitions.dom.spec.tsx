import { act, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { persistenceStatusAtom } from '@/shared/state/atoms'
import { customCssAtom, customCssDraftAtom, customCssEditorUiAtom, customCssSuspendedAtom } from '@/shared/state/customCssAtoms'
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
  return { store, view: renderWithStore(<CustomCssSection />, store) }
}

describe('CSS save and disable transitions', () => {
  it('can reaffirm unchanged CSS to supersede a failed disable', async () => {
    const { store, view } = setup()
    act(() => { store.set(persistenceStatusAtom, { status: 'error', failedDomains: ['customCss'] }) })
    const apply = view.getByRole('button', { name: 'content.customCss.apply' })
    expect(apply).not.toBeDisabled()
    await act(async () => { fireEvent.click(apply) })
    expect(actions.apply).toHaveBeenCalledWith('.original{}', { enabled: true, css: '.original{}' })
  })

  it('does not enable an unchanged apply for failures in unrelated domains', () => {
    const { store, view } = setup()
    act(() => { store.set(persistenceStatusAtom, { status: 'error', failedDomains: ['savedChatCss'] }) })
    expect(view.getByRole('button', { name: 'content.customCss.apply' })).toBeDisabled()
  })

  it('keeps the visible source when another page updates CSS during disable', async () => {
    const { store, view } = setup()
    let finish!: () => void
    actions.disable.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.disable' }))
    act(() => { store.set(customCssAtom, { enabled: true, css: '.external{}' }) })
    expect(view.getByLabelText('CSS')).toHaveValue('.original{}')
    await act(async () => { finish() })
    expect(view.getByLabelText('CSS')).toHaveValue('.original{}')
    expect(view.getByText('content.customCss.externalChange')).toBeInTheDocument()
  })

  it('does not treat its own confirmed disable as an external conflict', async () => {
    const { store, view } = setup()
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.draft{}' } })
    actions.disable.mockImplementationOnce(async () => {
      store.set(customCssAtom, { enabled: false, css: '.original{}' })
    })
    await act(async () => { fireEvent.click(view.getByRole('button', { name: 'content.customCss.disable' })) })
    expect(view.getByLabelText('CSS')).toHaveValue('.draft{}')
    expect(view.queryByText('content.customCss.externalChange')).toBeNull()
    await act(async () => { fireEvent.click(view.getByRole('button', { name: 'content.customCss.apply' })) })
    expect(actions.apply).toHaveBeenCalledWith('.draft{}', { enabled: false, css: '.original{}' })
  })

  it('keeps a pre-existing editing conflict after disabling', async () => {
    const { store, view } = setup()
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.draft{}' } })
    act(() => { store.set(customCssAtom, { enabled: true, css: '.external{}' }) })
    actions.disable.mockImplementationOnce(async () => {
      store.set(customCssAtom, { enabled: false, css: '.external{}' })
    })
    await act(async () => { fireEvent.click(view.getByRole('button', { name: 'content.customCss.disable' })) })
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.apply' }))
    expect(actions.apply).not.toHaveBeenCalled()
    expect(view.getByRole('group', { name: 'content.customCss.confirmTitle' })).toBeInTheDocument()
    expect(view.getByLabelText('CSS')).toHaveValue('.draft{}')
  })

  it('does not overwrite a later draft with an old disable completion', async () => {
    const { store, view } = setup()
    let finish!: () => void
    actions.disable.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.disable' }))
    const next = { css: '.next{}', baseline: { enabled: false, css: '.different{}' } }
    act(() => { store.set(customCssDraftAtom, next) })
    await act(async () => { finish() })
    expect(store.get(customCssDraftAtom)).toBe(next)
  })

  it('retains the draft and baseline when disabling fails', async () => {
    const { store, view } = setup()
    actions.disable.mockRejectedValueOnce(new Error('storage unavailable'))
    await act(async () => { fireEvent.click(view.getByRole('button', { name: 'content.customCss.disable' })) })
    expect(view.getByLabelText('CSS')).toHaveValue('.original{}')
    expect(store.get(customCssDraftAtom)).toEqual({ css: '.original{}', baseline: { enabled: true, css: '.original{}' } })
  })
})
