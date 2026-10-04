import { act, fireEvent, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAT_CSS_PRESETS } from '@/shared/settings/chatCssPresets'
import {
  customCssAtom,
  customCssDraftAtom,
  customCssFeedbackAtom,
  customCssLocalStopAtom,
  customCssOperationAtom,
  customCssRecoveryAtom,
  customCssSuspendedAtom,
  hasUnappliedCustomCssAtom,
  savedChatCssAtom,
} from '@/shared/state/customCssAtoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { CustomCssSection } from './CustomCssSection'
import { YTDLiveChatSetting } from './YTDLiveChatSetting'

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
  store.set(customCssSuspendedAtom, false)
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

describe('focused CSS settings', () => {
  it('starts with one selector and one Use button, without creating a draft or writing', () => {
    const { store, view } = setup()
    expect(view.getAllByRole('combobox')).toHaveLength(1)
    expect(view.queryByRole('textbox')).toBeNull()
    expect(view.queryByRole('button', { name: 'content.customCss.register' })).toBeNull()
    expect(view.container.querySelectorAll('[data-ylc-css-use]')).toHaveLength(1)
    expect(view.getByRole('button', { name: 'content.customCss.apply' })).not.toBeDisabled()
    expect(store.get(customCssDraftAtom)).toBeNull()
    expect(store.get(hasUnappliedCustomCssAtom)).toBe(false)
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled()
  })

  it('opens editing and named saving only on request, keeping trust information in the editor', () => {
    const { view } = setup()
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.emptyEditor' }))
    expect(view.getByLabelText('CSS')).toHaveFocus()
    expect(view.getByLabelText('CSS')).toHaveAccessibleDescription(/content.customCss.warning/)
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.register' }))
    expect(view.getByLabelText('content.customCss.name')).toHaveFocus()
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled()
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.cancelRegistration' }))
    expect(view.queryByLabelText('content.customCss.name')).toBeNull()
    expect(view.getByLabelText('CSS')).toHaveFocus()
  })

  it('returns to selection on Escape without discarding CSS, but ignores composing Escape', () => {
    const { view, store, onKeyDown } = setup()
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.emptyEditor' }))
    const editor = view.getByLabelText('CSS')
    fireEvent.change(editor, { target: { value: '.retained{}' } })
    fireEvent.keyDown(editor, { key: 'Escape', isComposing: true })
    expect(editor).toBeInTheDocument()
    onKeyDown.mockClear()
    fireEvent.keyDown(editor, { key: 'Escape' })
    expect(view.queryByLabelText('CSS')).toBeNull()
    expect(view.getByRole('button', { name: 'content.customCss.emptyEditor' })).toHaveFocus()
    expect(store.get(customCssDraftAtom)?.css).toBe('.retained{}')
    expect(onKeyDown).not.toHaveBeenCalled()
  })

  it('shows examples only for exact bundled CSS, never for an edited or imported source', () => {
    const { view } = setup()
    expect(view.container.querySelector('[data-ylc-css-example]')).toHaveAttribute('data-ylc-css-example', CHAT_CSS_PRESETS[0]?.id)
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.emptyEditor' }))
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '</style><script>unsafe()</script>' } })
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.choosePreset' }))
    const example = view.container.querySelector('[data-ylc-css-example]')
    expect(example).toHaveAttribute('data-ylc-css-example', 'custom')
    expect(example?.querySelector('script, style, iframe')).toBeNull()
  })

  it('keeps failure and external-change notices visible after returning to selection', () => {
    const { store, view } = setup()
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.emptyEditor' }))
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.draft{}' } })
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.choosePreset' }))
    act(() => {
      store.set(customCssAtom, { enabled: true, css: '.external{}' })
      store.set(customCssFeedbackAtom, { kind: 'error', operation: 'apply', code: 'unconfirmed' })
    })
    expect(view.getByRole('alert')).toHaveTextContent('content.customCss.saveFailed')
    expect(view.getByText('content.customCss.externalChange')).toBeVisible()
    expect(store.get(customCssDraftAtom)?.css).toBe('.draft{}')
  })

  it('keeps copy deletion inside editing and still requires confirmation', () => {
    const { store, view } = setup()
    act(() => {
      store.set(savedChatCssAtom, [{ id: 'mine', name: 'Mine', css: '.saved{}' }])
    })
    fireEvent.change(view.getByRole('combobox'), { target: { value: 'saved:mine' } })
    expect(view.queryByRole('button', { name: 'content.customCss.deleteSaved' })).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.emptyEditor' }))
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.deleteSaved' }))
    expect(actions.remove).not.toHaveBeenCalled()
    fireEvent.click(
      within(view.getByRole('group', { name: 'content.customCss.confirmTitle' })).getByRole('button', { name: 'content.customCss.cancel' }),
    )
    expect(view.getByLabelText('CSS')).toHaveValue('.saved{}')
  })

  it('distinguishes confirmed Off from unconfirmed Off and only resumes on explicit Use', async () => {
    const { store, view } = setup()
    act(() => {
      store.set(customCssAtom, { enabled: true, css: '.source{}' })
      store.set(customCssSuspendedAtom, true)
    })
    expect(view.getByRole('button', { name: 'content.customCss.resume' })).not.toBeDisabled()
    expect(actions.activate).not.toHaveBeenCalled()
    act(() => {
      store.set(customCssSuspendedAtom, false)
      store.set(customCssLocalStopAtom, true)
    })
    expect(view.getByText('content.customCss.stopUnconfirmed')).toBeVisible()
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'content.customCss.resume' }))
    })
    expect(actions.activate).toHaveBeenCalledWith('.source{}', { enabled: true, css: '.source{}' })
  })

  it('keeps Off available during Use and a pending resume, and retains the copyable source', () => {
    const { store, view } = setup()
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.emptyEditor' }))
    act(() => {
      store.set(customCssOperationAtom, 'apply')
    })
    expect(view.container.querySelector('[data-ylc-css-use]')).toBeDisabled()
    expect(view.getByLabelText('CSS')).toHaveAttribute('readonly')
    expect(view.getByLabelText('CSS')).not.toBeDisabled()
    expect(view.getByRole('button', { name: 'content.customCss.disable' })).not.toBeDisabled()
    act(() => {
      store.set(customCssRecoveryAtom, { pending: true, target: false, failed: false })
    })
    expect(view.getByRole('button', { name: 'content.customCss.disable' })).not.toBeDisabled()
  })

  it('returns focus to Use after a confirmed Off removes its trigger', async () => {
    const { store, view } = setup()
    act(() => {
      store.set(customCssAtom, { enabled: true, css: '.source{}' })
    })
    actions.suspend.mockImplementationOnce(async () => {
      store.set(customCssSuspendedAtom, true)
    })
    const off = view.getByRole('button', { name: 'content.customCss.disable' })
    off.focus()
    await act(async () => {
      fireEvent.click(off)
    })
    expect(view.queryByRole('button', { name: 'content.customCss.disable' })).toBeNull()
    expect(view.getByRole('button', { name: 'content.customCss.resume' })).toHaveFocus()
  })

  it('uses a separate CSS tab without replacing the main settings groups or controls', async () => {
    const store = createTestStore()
    store.set(customCssSuspendedAtom, false)
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={vi.fn()} />, store)
    const settingsTab = view.getByRole('tab', { name: 'content.setting.header.setting' })
    expect(settingsTab).toHaveAttribute('aria-selected', 'true')
    expect(view.getAllByRole('tab').map(tab => tab.textContent)).toEqual([
      'content.setting.header.setting',
      'content.customCss.title',
      'content.setting.header.preset',
    ])
    const groups = Array.from(view.getByRole('tabpanel').querySelectorAll(':scope > fieldset'))
    expect(groups.map(group => group.querySelector('legend')?.textContent)).toEqual([
      'content.setting.group.display',
      'content.setting.group.colors',
      'content.setting.group.text',
      'content.setting.group.elements',
    ])
    expect(view.getByRole('group', { name: 'content.setting.group.colors' })).toBeInTheDocument()
    expect(view.getByRole('group', { name: 'content.setting.group.text' })).toBeInTheDocument()
    expect(view.getByRole('group', { name: 'content.setting.group.elements' })).toBeInTheDocument()
    expect(view.queryByRole('group', { name: 'content.customCss.title' })).toBeNull()

    const cssTab = view.getByRole('tab', { name: 'content.customCss.title' })
    fireEvent.click(cssTab)
    expect(view.getByRole('tabpanel', { name: 'content.customCss.title' })).toHaveAttribute('aria-labelledby', cssTab.id)
    expect(view.getByRole('group', { name: 'content.customCss.title' })).toBeInTheDocument()
    expect(view.queryByRole('group', { name: 'content.setting.group.display' })).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.emptyEditor' }))
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.tab-source{}' } })
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'content.customCss.apply' }))
    })
    expect(actions.activate).toHaveBeenCalledWith('.tab-source{}', { enabled: false, css: '' })

    fireEvent.click(settingsTab)
    act(() => {
      store.set(customCssOperationAtom, 'apply')
    })
    expect(view.getByLabelText('content.setting.alwaysOnDisplay')).not.toBeDisabled()
  })
})
