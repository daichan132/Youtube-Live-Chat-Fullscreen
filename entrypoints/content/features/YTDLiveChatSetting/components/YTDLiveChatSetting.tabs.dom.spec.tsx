import { act, fireEvent, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { type AppRuntime, createAppRuntime } from '@/shared/runtime/createAppRuntime'
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
  return { runtime, view, onOpenChange }
}

const editCss = (view: Awaited<ReturnType<typeof open>>['view'], css: string) => {
  fireEvent.click(view.getByRole('tab', { name: 'content.customCss.title' }))
  fireEvent.click(view.getByRole('button', { name: 'content.customCss.emptyEditor' }))
  fireEvent.change(view.getByLabelText('CSS'), { target: { value: css } })
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
    expect(runtime.store.get(chatSettingsStateAtom).profile).toBe(profile)
    expect(runtime.store.get(editorSessionStateAtom).past).toBe(history)
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
    expect(runtime.store.get(customCssEditorUiAtom)).toMatchObject({ name: 'My draft', registering: true, expanded: true })
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
})
