import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { Provider } from 'jotai'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  customCssAtom,
  customCssDraftAtom,
  customCssEditorUiAtom,
  customCssFeedbackAtom,
  customCssOperationAtom,
  customCssRecoveryAtom,
  customCssSuspendedAtom,
} from '@/shared/state/customCssAtoms'
import { createTestStore } from '@/shared/state/testUtils'
import { CustomCssSection } from './CustomCssSection'
import { YTDLiveChatSetting } from './YTDLiveChatSetting'

const actions = vi.hoisted(() => ({ activate: vi.fn(), register: vi.fn(), remove: vi.fn(), suspend: vi.fn() }))
const modalParent = vi.hoisted(() => ({ current: null as HTMLElement | null }))
vi.mock('@/shared/runtime/AppProvider', () => ({ useOptionalAppRuntime: () => ({ customCss: actions }) }))
vi.mock('../utils/getModalParentElement', () => ({ getModalParentElement: () => modalParent.current ?? document.body }))
const hosts: HTMLElement[] = []
beforeEach(() => { for (const action of Object.values(actions)) action.mockReset().mockResolvedValue(undefined) })
afterEach(() => {
  cleanup()
  hosts.splice(0).forEach(host => { host.remove() })
  modalParent.current = null
})
const createOutsideControl = () => {
  const button = document.createElement('button')
  document.body.append(button)
  hosts.push(button)
  return button
}
const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>(yes => { resolve = yes })
  return { promise, resolve }
}
const createStore = () => {
  const store = createTestStore()
  const active = { enabled: true, css: '.original{}' }
  store.set(customCssAtom, active)
  store.set(customCssSuspendedAtom, false)
  store.set(customCssDraftAtom, { css: '.draft{}', baseline: active })
  store.set(customCssEditorUiAtom, { expanded: true, registering: true, name: 'Keep', source: null })
  return store
}
const mount = (shadow: boolean, store: ReturnType<typeof createStore>, ui: ReactElement) => {
  const host = document.createElement('div')
  document.body.append(host)
  hosts.push(host)
  const root = shadow ? host.attachShadow({ mode: 'open' }) : document
  const scope = document.createElement('div')
  if (root instanceof ShadowRoot) root.append(scope)
  else host.append(scope)
  const container = document.createElement('div')
  scope.append(container)
  modalParent.current = scope
  const view = render(<Provider store={store}>{ui}</Provider>, { container, baseElement: scope })
  return { view, focused: () => root.activeElement }
}

describe.each([false, true])('CSS focus ownership (shadow root: %s)', shadow => {
  it.each([[false, false], [true, false], [false, true], [true, true]])(
    'does not steal moved focus when registration settles (failure: %s, outside root: %s)', async (failed, outside) => {
      const store = createStore()
      const { view, focused } = mount(shadow, store, <><CustomCssSection /><button type='button'>Other control</button></>)
      const gate = deferred()
      actions.register.mockImplementationOnce(async () => {
        store.set(customCssOperationAtom, 'register')
        await gate.promise
        store.set(customCssFeedbackAtom, failed
          ? { kind: 'error', operation: 'register', code: 'storage' }
          : { kind: 'success', operation: 'register' })
        store.set(customCssOperationAtom, null)
        if (failed) throw new Error('save failed')
      })
      fireEvent.click(view.getByRole('button', { name: 'content.customCss.saveRegistration' }))
      const other = outside ? createOutsideControl() : view.getByRole('button', { name: 'Other control' })
      other.focus()
      await act(async () => { gate.resolve() })
      expect(outside ? document.activeElement : focused()).toBe(other)
      expect(store.get(customCssDraftAtom)?.css).toBe('.draft{}')
      expect(store.get(customCssEditorUiAtom).name).toBe(failed ? 'Keep' : '')
    },
  )

  it.each([false, true])('restores registration focus when it has not moved away (failure: %s)', async failed => {
    const store = createStore()
    const { view, focused } = mount(shadow, store, <CustomCssSection />)
    const gate = deferred()
    actions.register.mockImplementationOnce(async () => {
      store.set(customCssOperationAtom, 'register')
      await gate.promise
      store.set(customCssFeedbackAtom, failed
        ? { kind: 'error', operation: 'register', code: 'storage' }
        : { kind: 'success', operation: 'register' })
      store.set(customCssOperationAtom, null)
      if (failed) throw new Error('save failed')
    })
    const name = view.getByLabelText('content.customCss.name')
    name.focus()
    fireEvent.keyDown(name, { key: 'Enter' })
    await act(async () => { gate.resolve() })
    expect(focused()).toBe(failed ? name : view.getByLabelText('CSS'))
  })

  it.each(['stay', 'inside', 'outside'])('restores Off focus only when it still owns it (focus: %s)', async focus => {
    const store = createStore()
    const { view, focused } = mount(shadow, store, <><CustomCssSection /><button type='button'>Other control</button></>)
    const gate = deferred()
    actions.suspend.mockImplementationOnce(async () => {
      store.set(customCssRecoveryAtom, { pending: true, target: true, failed: false })
      await gate.promise
      store.set(customCssSuspendedAtom, true)
      store.set(customCssRecoveryAtom, { pending: false, target: true, failed: false })
    })
    const stop = view.getByRole('button', { name: 'content.customCss.disable' })
    stop.focus()
    fireEvent.click(stop)
    const other = focus === 'outside' ? createOutsideControl() : view.getByRole('button', { name: 'Other control' })
    if (focus !== 'stay') other.focus()
    await act(async () => { gate.resolve() })
    expect(focus === 'outside' ? document.activeElement : focused())
      .toBe(focus === 'stay' ? view.container.querySelector('[data-ylc-css-use]') : other)
  })

  it.each(['CSS', 'content.customCss.name'])('dismisses only the close confirmation from %s', label => {
    const store = createStore()
    const onOpenChange = vi.fn()
    const { view, focused } = mount(shadow, store, <YTDLiveChatSetting open onOpenChange={onOpenChange} />)
    const input = view.getByLabelText(label)
    input.focus()
    fireEvent.click(view.getByRole('button', { name: 'content.aria.close' }))
    const keepEditing = view.getByRole('button', { name: 'content.customCss.keepEditing' })
    expect(focused()).toBe(keepEditing)
    input.focus()
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true })
    expect(view.getByRole('button', { name: 'content.customCss.keepEditing' })).toBe(keepEditing)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(view.queryByRole('button', { name: 'content.customCss.keepEditing' })).toBeNull()
    expect(focused()).toBe(input)
    expect(store.get(customCssEditorUiAtom)).toMatchObject({ name: 'Keep', registering: true, expanded: true })
    expect(store.get(customCssDraftAtom)?.css).toBe('.draft{}')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('returns from the close confirmation to the actual input inside its root', () => {
    const store = createStore()
    const { view, focused } = mount(shadow, store, <YTDLiveChatSetting open onOpenChange={vi.fn()} />)
    const input = view.getByLabelText('content.customCss.name')
    input.focus()
    fireEvent.click(view.getByRole('button', { name: 'content.aria.close' }))
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.keepEditing' }))
    expect(focused()).toBe(input)
  })
})
