import { act, fireEvent, render, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { storage } from 'wxt/utils/storage'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { type AppRuntime, createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { CHAT_CSS_PRESETS } from '@/shared/settings/chatCssPresets'
import { createSettingsRepository, type SettingsRepository } from '@/shared/settings/repository'
import { chatSettingsStateAtom, EMPTY_MESSAGES, editorSessionStateAtom } from '@/shared/state/atoms'
import { commitStylePatchAtom } from '@/shared/state/commands'
import { appliedChatCssAtom, customCssAtom, customCssDraftAtom, customCssEditorUiAtom } from '@/shared/state/customCssAtoms'
import { YTDLiveChatSetting } from './YTDLiveChatSetting'

const sessions: { runtime: AppRuntime; repository: SettingsRepository }[] = []
afterEach(async () => {
  await Promise.allSettled(sessions.map(({ repository }) => repository.flush()))
  for (const { runtime } of sessions.splice(0)) runtime.dispose()
  vi.restoreAllMocks()
})
const open = async () => {
  const repository = createSettingsRepository(undefined, null, { waitBeforeRetry: async () => {} })
  const runtime = await createAppRuntime(repository, { loadMessages: async () => EMPTY_MESSAGES })
  sessions.push({ runtime, repository })
  const onOpenChange = vi.fn()
  const view = render(
    <AppProvider runtime={runtime}>
      <YTDLiveChatSetting open onOpenChange={onOpenChange} />
    </AppProvider>,
  )
  return { runtime, repository, view, onOpenChange }
}

const editCss = (view: Awaited<ReturnType<typeof open>>['view'], css: string) => {
  fireEvent.click(view.getByRole('tab', { name: 'content.customCss.title' }))
  fireEvent.change(view.getByLabelText('CSS'), { target: { value: css } })
}

const savedRow = (view: Awaited<ReturnType<typeof open>>['view'], id: string) => {
  const panel = view.getByRole('tabpanel', { name: 'content.customCss.title' })
  const library = panel.querySelector<HTMLDetailsElement>('.ylc-custom-css-library')
  const summary = library?.querySelector('summary')
  if (library && !library.open && summary) fireEvent.click(summary)
  const row = panel.querySelector<HTMLElement>(`[data-ylc-saved-css="${id}"]`)
  if (!row) throw new Error(`Missing saved style row: ${id}`)
  return within(row)
}

describe('settings, CSS and preset tabs', () => {
  it('opens on settings and applies edited CSS through its separate labelled tab', async () => {
    const { runtime, view } = await open()
    expect(view.getAllByRole('tab').map(tab => tab.textContent)).toEqual([
      'content.setting.header.setting',
      'content.customCss.title',
      'content.setting.header.preset',
    ])
    expect(view.getByRole('tab', { name: 'content.setting.header.setting' })).toHaveAttribute('aria-selected', 'true')
    expect(view.queryByLabelText('CSS')).toBeNull()
    expect(view.getByRole('slider', { name: 'content.setting.fontSize' })).toBeInTheDocument()
    act(() => runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 21 } }))
    const profile = runtime.store.get(chatSettingsStateAtom).profile
    const history = runtime.store.get(editorSessionStateAtom).past
    const activate = vi.spyOn(runtime.customCss, 'activate')

    editCss(view, 'body { color: red }')
    const cssTab = view.getByRole('tab', { name: 'content.customCss.title' })
    const panel = view.getByRole('tabpanel', { name: 'content.customCss.title' })
    expect(cssTab).toHaveAttribute('aria-selected', 'true')
    expect(cssTab).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveAttribute('aria-labelledby', cssTab.id)
    expect(view.queryByRole('slider', { name: 'content.setting.fontSize' })).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.apply' }))
    await waitFor(() => expect(runtime.store.get(appliedChatCssAtom)).toBe('body { color: red }'))
    expect(activate).toHaveBeenCalledWith('body { color: red }', { enabled: false, css: '' })
    expect(runtime.store.get(customCssAtom)).toEqual({ enabled: true, css: 'body { color: red }' })
    expect(await storage.getItem('local:ylc-custom-css')).toMatchObject({ value: { enabled: true, css: 'body { color: red }' } })
    expect(runtime.store.get(chatSettingsStateAtom).profile).toBe(profile)
    expect(runtime.store.get(editorSessionStateAtom).past).toBe(history)
  })

  it('opens ordinary appearance settings directly while preserving the loaded CSS and preview', async () => {
    const { runtime, view } = await open()
    const preset = CHAT_CSS_PRESETS.find(entry => entry.id === 'messenger')
    if (!preset) throw new Error('Missing messenger preset')
    fireEvent.click(view.getByRole('tab', { name: 'content.customCss.title' }))
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.choosePreset' }))
    const card = view.baseElement.querySelector<HTMLButtonElement>('[data-ylc-css-preset-choice="messenger"]')
    if (!card) throw new Error('Missing messenger choice')
    fireEvent.click(card)
    expect(view.getByLabelText('CSS')).toHaveValue(preset.css)
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.adjustAppearance' }))
    const settingsTab = view.getByRole('tab', { name: 'content.setting.header.setting' })
    expect(settingsTab).toHaveAttribute('aria-selected', 'true')
    expect(settingsTab).toHaveFocus()
    expect(view.getByRole('slider', { name: 'content.setting.fontSize' })).toBeInTheDocument()
    expect(runtime.store.get(customCssDraftAtom)?.css).toBe(preset.css)
    act(() => runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 23 } }))
    fireEvent.click(view.getByRole('tab', { name: 'content.customCss.title' }))
    expect(view.getByLabelText('CSS')).toHaveValue(preset.css)
    expect(view.baseElement.querySelector('iframe[data-ylc-css-preview="messenger"]')?.getAttribute('srcdoc')).toContain(
      '--extension-yt-live-chat-font-size:23px',
    )
  })

  it('keeps CSS and its registration name across both other tabs while arrow focus stays on the selected tab', async () => {
    const user = userEvent.setup()
    const { runtime, view } = await open()
    editCss(view, '.draft { color: blue }')
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.register' }))
    fireEvent.change(view.getByLabelText('content.customCss.name'), { target: { value: 'My draft' } })
    fireEvent.click(view.getByRole('tab', { name: 'content.setting.header.setting' }))
    expect(view.queryByLabelText('CSS')).toBeNull()
    expect(view.getByRole('slider', { name: 'content.setting.fontSize' })).toBeInTheDocument()
    const presetTab = view.getByRole('tab', { name: 'content.setting.header.preset' })
    fireEvent.click(presetTab)
    expect(view.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', presetTab.id)
    presetTab.focus()
    await user.keyboard('{ArrowLeft}')

    const cssTab = view.getByRole('tab', { name: 'content.customCss.title' })
    expect(cssTab).toHaveFocus()
    expect(cssTab).toHaveAttribute('aria-selected', 'true')
    expect(view.getByLabelText('CSS')).toHaveValue('.draft { color: blue }')
    expect(view.getByLabelText('content.customCss.name')).toHaveValue('My draft')
    expect(runtime.store.get(customCssDraftAtom)?.css).toBe('.draft { color: blue }')
    expect(runtime.store.get(customCssEditorUiAtom)).toMatchObject({ name: 'My draft', registering: true })
    expect(runtime.store.get(appliedChatCssAtom)).toBe('')
  })

  it('keeps the close warning active for a CSS draft while another tab is selected', async () => {
    const { runtime, view, onOpenChange } = await open()
    editCss(view, '.unapplied {}')
    fireEvent.click(view.getByRole('tab', { name: 'content.setting.header.preset' }))
    fireEvent.click(view.getByRole('button', { name: 'content.aria.close' }))
    expect(view.getByText('content.customCss.discardOnClose')).toBeInTheDocument()
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.keepEditing' }))
    expect(onOpenChange).not.toHaveBeenCalled()
    fireEvent.click(view.getByRole('tab', { name: 'content.customCss.title' }))
    expect(view.getByLabelText('CSS')).toHaveValue('.unapplied {}')
    fireEvent.click(view.getByRole('tab', { name: 'content.setting.header.setting' }))
    fireEvent.click(view.getByRole('button', { name: 'content.aria.close' }))
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.discardAndClose' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(runtime.store.get(customCssDraftAtom)).toBeNull()
  })
  it('uses the clicked saved style through real persistence only after unapplied replacement is confirmed', async () => {
    const { runtime, repository, view } = await open()
    await act(async () => {
      await repository.saveSavedChatCss([{ id: 'named', name: 'My named style', css: '.named { color: orange }' }])
    })
    const activate = vi.spyOn(runtime.customCss, 'activate')
    editCss(view, '.unapplied { color: blue }')
    const row = savedRow(view, 'named')
    expect(row.getByRole('button', { name: 'content.customCss.loadSaved' })).toHaveTextContent('My named style')
    fireEvent.click(row.getByRole('button', { name: 'content.customCss.useSavedLabel' }))
    expect(activate).not.toHaveBeenCalled()
    expect(view.getByLabelText('CSS')).toHaveValue('.unapplied { color: blue }')
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.cancel' }))
    expect(view.getByLabelText('CSS')).toHaveValue('.unapplied { color: blue }')
    expect(runtime.store.get(customCssEditorUiAtom).source).toBeNull()
    expect(runtime.store.get(appliedChatCssAtom)).toBe('')

    fireEvent.click(row.getByRole('button', { name: 'content.customCss.useSavedLabel' }))
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.overwriteApply' }))
    await waitFor(() => expect(runtime.store.get(appliedChatCssAtom)).toBe('.named { color: orange }'))
    expect(activate).toHaveBeenCalledTimes(1)
    expect(activate).toHaveBeenCalledWith('.named { color: orange }', { enabled: false, css: '' })
    expect(await storage.getItem('local:ylc-custom-css')).toMatchObject({ value: { enabled: true, css: '.named { color: orange }' } })
    expect(view.getByLabelText('CSS')).toHaveValue('.named { color: orange }')
    expect(view.getByLabelText('CSS')).toHaveFocus()
    expect(runtime.store.get(customCssEditorUiAtom).source).toEqual({ kind: 'saved', id: 'named' })
  })

  it('loads a named row without applying and retains its source, edited text and new copy name across tabs', async () => {
    const { runtime, repository, view } = await open()
    await act(async () => {
      await repository.saveSavedChatCss([{ id: 'named', name: 'My named style', css: '.named {}' }])
    })
    const activate = vi.spyOn(runtime.customCss, 'activate')
    fireEvent.click(view.getByRole('tab', { name: 'content.customCss.title' }))
    fireEvent.click(savedRow(view, 'named').getByRole('button', { name: 'content.customCss.loadSaved' }))
    expect(view.getByLabelText('CSS')).toHaveValue('.named {}')
    fireEvent.change(view.getByLabelText('CSS'), { target: { value: '.edited named {}' } })
    expect(savedRow(view, 'named').getByRole('button', { name: 'content.customCss.loadSaved' })).toHaveTextContent('My named style')
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.reloadSaved' }))
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.cancel' }))
    expect(view.getByLabelText('CSS')).toHaveValue('.edited named {}')
    expect(runtime.store.get(customCssEditorUiAtom).source).toEqual({ kind: 'saved', id: 'named' })
    expect(savedRow(view, 'named').getByRole('button', { name: 'content.customCss.loadSaved' })).toHaveTextContent('My named style')
    fireEvent.click(view.getByRole('button', { name: 'content.customCss.register' }))
    expect(view.getByLabelText('content.customCss.name')).toHaveValue('')
    fireEvent.change(view.getByLabelText('content.customCss.name'), { target: { value: 'Edited named style' } })
    fireEvent.click(view.getByRole('tab', { name: 'content.setting.header.preset' }))
    fireEvent.click(view.getByRole('tab', { name: 'content.customCss.title' }))
    expect(view.getByLabelText('CSS')).toHaveValue('.edited named {}')
    expect(view.getByLabelText('content.customCss.name')).toHaveValue('Edited named style')
    expect(runtime.store.get(customCssEditorUiAtom).source).toEqual({ kind: 'saved', id: 'named' })
    expect(runtime.store.get(appliedChatCssAtom)).toBe('')
    expect(activate).not.toHaveBeenCalled()
    expect(await storage.getItem('local:ylc-saved-chat-css')).toMatchObject({
      value: [{ id: 'named', name: 'My named style', css: '.named {}' }],
    })
  })
})
