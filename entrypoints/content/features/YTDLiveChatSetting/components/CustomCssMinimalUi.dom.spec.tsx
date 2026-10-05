import { act, fireEvent, type RenderResult, within } from '@testing-library/react'
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

const savedRow = (view: RenderResult, id: string) => {
  const row = view.container.querySelector<HTMLElement>(`[data-ylc-saved-css="${id}"]`)
  if (!row) throw new Error(`Missing saved style row: ${id}`)
  return within(row)
}

describe('focused CSS settings', () => {
  it('starts with visible empty CSS and one explicit Use button, without creating a draft or writing', () => {
    const { store, view } = setup()
    expect(view.getAllByRole('combobox')).toHaveLength(1)
    expect(view.getByLabelText('CSS')).toBeVisible()
    expect(view.getByLabelText('CSS')).toHaveValue('')
    expect(view.queryByLabelText('content.customCss.name')).toBeNull()
    expect(view.container.querySelectorAll('[data-ylc-css-use]')).toHaveLength(1)
    expect(view.getByRole('button', { name: 'content.customCss.apply' })).toBeDisabled()
    expect(store.get(customCssDraftAtom)).toBeNull()
    expect(store.get(hasUnappliedCustomCssAtom)).toBe(false)
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled()
  })

  it('opens named saving only on request and keeps trust information attached to the visible editor', () => {
    const { view } = setup()
    expect(view.getByLabelText('CSS')).toHaveAccessibleDescription(/content.customCss.warning/)
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.save{}' } })
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.register' }))
    expect(view.getByLabelText('content.customCss.name')).toHaveFocus()
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled()
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.cancelRegistration' }))
    expect(view.queryByLabelText('content.customCss.name')).toBeNull()
    expect(view.getByLabelText('CSS')).toHaveFocus()
    expect(view.getByLabelText('CSS')).toHaveValue('.save{}')
  })

  it('keeps CSS visible when Escape requests modal close and ignores composing Escape', () => {
    const store = createTestStore()
    const onOpenChange = vi.fn()
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={onOpenChange} />, store)
    fireEvent.click(view.getByRole('tab', { name: 'content.customCss.title' }))
    const editor = view.getByLabelText('CSS')
    editor.focus()
    fireEvent.change(editor, { target: { value: '.retained{}' } })
    fireEvent.keyDown(editor, { key: 'Escape', isComposing: true })
    expect(view.queryByText('content.customCss.discardOnClose')).toBeNull()
    expect(editor).toBeVisible()
    fireEvent.keyDown(editor, { key: 'Escape' })
    expect(view.getByText('content.customCss.discardOnClose')).toBeInTheDocument()
    expect(editor).toBeVisible()
    expect(store.get(customCssDraftAtom)?.css).toBe('.retained{}')
    expect(onOpenChange).not.toHaveBeenCalled()
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.keepEditing' }))
    expect(editor).toHaveFocus()
    expect(editor).toHaveValue('.retained{}')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('renders a sandboxed preview only for exact bundled CSS, never for an edited or imported source', () => {
    const { view } = setup()
    const preset = CHAT_CSS_PRESETS[0]
    if (!preset) throw new Error('Missing starter style')
    fireEvent.change(view.getByRole('combobox'), { target: { value: `preset:${preset.id}` } })
    expect(view.container.querySelector('[data-ylc-css-preview]')).toHaveAttribute('data-ylc-css-preview', preset.id)
    expect(view.container.querySelector('[data-ylc-css-preview]')).toHaveAttribute('sandbox', '')
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '</style><script>unsafe()</script>' } })
    expect(view.container.querySelector('[data-ylc-css-preview]')).toBeNull()
    expect(view.container.querySelectorAll('.ylc-custom-css-browse [data-ylc-css-example]')).toHaveLength(CHAT_CSS_PRESETS.length)
    expect(view.getByRole('group', { name: 'content.customCss.title' }).querySelector('script, style, iframe')).toBeNull()
    expect(view.getByLabelText('CSS')).toHaveValue('</style><script>unsafe()</script>')
    expect(view.getByLabelText('CSS')).toHaveAccessibleDescription(/content.customCss.warning/)
  })

  it('keeps failure and external-change notices visible alongside the editor', () => {
    const { store, view } = setup()
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.draft{}' } })
    act(() => {
      store.set(customCssAtom, { enabled: true, css: '.external{}' })
      store.set(customCssFeedbackAtom, { kind: 'error', operation: 'apply', code: 'unconfirmed' })
    })
    expect(view.getByRole('alert')).toHaveTextContent('content.customCss.saveFailed')
    expect(view.getByText('content.customCss.externalChange')).toBeVisible()
    expect(view.getByLabelText('CSS')).toBeVisible()
    expect(view.getByLabelText('CSS')).toHaveValue('.draft{}')
    expect(store.get(customCssDraftAtom)?.css).toBe('.draft{}')
  })

  it('lists named styles with a separate delete action that still requires confirmation', () => {
    const { store, view } = setup()
    act(() => {
      store.set(savedChatCssAtom, [{ id: 'mine', name: 'Mine', css: '.saved{}' }])
    })
    const row = savedRow(view, 'mine')
    expect(row.getByRole('button', { name: 'content.customCss.loadSaved' })).toHaveTextContent('Mine')
    fireEvent.click(row.getByRole('button', { name: 'content.customCss.loadSaved' }))
    fireEvent.click(row.getByRole('button', { name: 'content.customCss.deleteSavedLabel' }))
    expect(actions.remove).not.toHaveBeenCalled()
    fireEvent.click(
      within(view.getByRole('group', { name: 'content.customCss.confirmTitle' })).getByRole('button', { name: 'content.customCss.cancel' }),
    )
    expect(view.getByLabelText('CSS')).toHaveValue('.saved{}')
    expect(store.get(savedChatCssAtom)).toEqual([{ id: 'mine', name: 'Mine', css: '.saved{}' }])
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
