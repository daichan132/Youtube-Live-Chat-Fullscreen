import { act, fireEvent, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'jotai'
import { describe, expect, it, vi } from 'vitest'
import {
  chatSettingsStateAtom,
  EMPTY_MESSAGES,
  editorSessionStateAtom,
  localeStateAtom,
  localeStateFromMessages,
} from '@/shared/state/atoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { createStyleHistoryCommands } from '../styleHistoryCommands'
import { YTDLiveChatSetting } from './YTDLiveChatSetting'

describe('settings initial focus and keyboard navigation', () => {
  it('enters the selected tab with Tab, then preserves arrow selection and the next control', async () => {
    const user = userEvent.setup()
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={vi.fn()} />, createTestStore())
    const panel = document.querySelector('.ylc-setting-panel') as HTMLElement
    const settingsTab = view.getByRole('tab', { name: 'content.setting.header.setting' })
    const cssTab = view.getByRole('tab', { name: 'content.customCss.title' })
    const presetTab = view.getByRole('tab', { name: 'content.setting.header.preset' })

    await waitFor(() => expect(panel).toHaveFocus())
    expect(settingsTab).not.toHaveFocus()
    expect(presetTab).not.toHaveFocus()
    expect(settingsTab).toHaveAttribute('tabindex', '0')
    expect(settingsTab).toHaveClass('ylc-theme-focus-ring-soft')

    await user.tab()
    expect(settingsTab).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(cssTab).toHaveFocus()
    expect(cssTab).toHaveAttribute('aria-selected', 'true')
    expect(view.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', cssTab.id)
    await user.keyboard('{ArrowRight}')
    expect(presetTab).toHaveFocus()
    expect(presetTab).toHaveAttribute('aria-selected', 'true')
    expect(settingsTab).toHaveAttribute('tabindex', '-1')
    expect(view.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', presetTab.id)

    await user.keyboard('{ArrowLeft}')
    expect(cssTab).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(settingsTab).toHaveFocus()
    expect(settingsTab).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowLeft}')
    expect(presetTab).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(settingsTab).toHaveFocus()
    await user.tab()
    expect(view.getByRole('button', { name: 'content.aria.close' })).toHaveFocus()
  })

  it('follows visual arrow direction for Arabic RTL tabs and updates when locale direction changes', async () => {
    const user = userEvent.setup()
    const store = createTestStore()
    store.set(localeStateAtom, localeStateFromMessages('ar', EMPTY_MESSAGES))
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={vi.fn()} />, store)
    const panel = document.querySelector('.ylc-setting-panel') as HTMLElement
    const settingsTab = view.getByRole('tab', { name: 'content.setting.header.setting' })
    const cssTab = view.getByRole('tab', { name: 'content.customCss.title' })
    const presetTab = view.getByRole('tab', { name: 'content.setting.header.preset' })
    expect(panel).toHaveAttribute('dir', 'rtl')
    await waitFor(() => expect(panel).toHaveFocus())
    await user.tab()
    expect(settingsTab).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(cssTab).toHaveFocus()
    expect(cssTab).toHaveAttribute('aria-selected', 'true')
    expect(view.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', cssTab.id)
    await user.keyboard('{ArrowLeft}')
    expect(presetTab).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(settingsTab).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(presetTab).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(cssTab).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(settingsTab).toHaveFocus()

    act(() => store.set(localeStateAtom, localeStateFromMessages('en', EMPTY_MESSAGES)))
    expect(panel).toHaveAttribute('dir', 'ltr')
    await user.keyboard('{ArrowRight}')
    expect(cssTab).toHaveFocus()
    expect(cssTab).toHaveAttribute('aria-selected', 'true')
  })

  it('reopens on the panel while retaining the selected tab for keyboard entry', async () => {
    const user = userEvent.setup()
    const store = createTestStore()
    const onOpenChange = vi.fn()
    const setting = (open: boolean) => (
      <Provider store={store}>
        <YTDLiveChatSetting open={open} onOpenChange={onOpenChange} />
      </Provider>
    )
    const view = render(setting(true))
    await waitFor(() => expect(document.querySelector('.ylc-setting-panel')).toHaveFocus())
    await user.tab()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(view.getByRole('tab', { name: 'content.setting.header.preset' })).toHaveFocus()

    view.rerender(setting(false))
    expect(view.queryByRole('dialog')).not.toBeInTheDocument()
    view.rerender(setting(true))
    await waitFor(() => expect(document.querySelector('.ylc-setting-panel')).toHaveFocus())
    const presetTab = view.getByRole('tab', { name: 'content.setting.header.preset' })
    expect(presetTab).toHaveAttribute('aria-selected', 'true')
    expect(presetTab).not.toHaveFocus()
    await user.tab()
    expect(presetTab).toHaveFocus()
  })

  it('handles Undo immediately after opening while focus stays on the panel', async () => {
    const user = userEvent.setup()
    const store = createTestStore()
    const initial = store.get(chatSettingsStateAtom).profile
    const { commitYLCStyleUpdate } = createStyleHistoryCommands(store)
    renderWithStore(<YTDLiveChatSetting open onOpenChange={vi.fn()} />, store)
    await waitFor(() => expect(document.querySelector('.ylc-setting-panel')).toHaveFocus())
    act(() => commitYLCStyleUpdate({ appearance: { fontSize: initial.appearance.fontSize + 1 } }, 'fontSize'))

    await user.keyboard('{Meta>}z{/Meta}')

    expect(store.get(chatSettingsStateAtom).profile).toEqual(initial)
    expect(document.querySelector('.ylc-setting-panel')).toHaveFocus()
  })

  it.each(['Escape', 'close button'])('commits a held slider gesture before closing with %s', closeWith => {
    const store = createTestStore()
    const initial = store.get(chatSettingsStateAtom).profile
    const committed = vi.fn()
    const unsubscribe = store.sub(chatSettingsStateAtom, committed)
    const onOpenChange = vi.fn((open: boolean) => ({
      open,
      fontSize: store.get(chatSettingsStateAtom).profile.appearance.fontSize,
      draftProfile: store.get(editorSessionStateAtom).draftProfile,
    }))
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={onOpenChange} />, store)
    const range = view.getByRole('slider', { name: 'content.setting.fontSize' })

    try {
      fireEvent.keyDown(range, { key: 'ArrowRight' })
      fireEvent.input(range, { target: { value: '14' } })
      fireEvent.keyDown(range, { key: 'ArrowRight', repeat: true })
      fireEvent.input(range, { target: { value: '15' } })
      expect(store.get(chatSettingsStateAtom).profile).toBe(initial)
      expect(committed).not.toHaveBeenCalled()

      // Neither Escape nor removing an iframe has to dispatch slider blur.
      if (closeWith === 'Escape') {
        fireEvent.keyDown(range, { key: 'Escape' })
      } else {
        fireEvent.click(view.getByRole('button', { name: 'content.aria.close' }))
      }
      expect(onOpenChange).toHaveBeenCalledOnce()
      expect(onOpenChange.mock.results[0]?.value).toEqual({ open: false, fontSize: 15, draftProfile: null })
      expect(committed).toHaveBeenCalledOnce()
      expect(store.get(editorSessionStateAtom).past).toEqual([initial])
      view.unmount()
      expect(committed).toHaveBeenCalledOnce()
      expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(15)
    } finally {
      unsubscribe()
    }
  })

  it.each(['keyboard', 'pointer'])('commits a %s gesture on window blur without input blur or keyup', gesture => {
    const store = createTestStore()
    const initial = store.get(chatSettingsStateAtom).profile
    const committed = vi.fn()
    const unsubscribe = store.sub(chatSettingsStateAtom, committed)
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={vi.fn()} />, store)
    const range = view.getByRole('slider', { name: 'content.setting.fontSize' })

    try {
      if (gesture === 'keyboard') {
        fireEvent.keyDown(range, { key: 'ArrowRight' })
      } else {
        fireEvent.pointerDown(range, { pointerId: 1 })
      }
      fireEvent.input(range, { target: { value: '15' } })
      expect(committed).not.toHaveBeenCalled()

      fireEvent.blur(window)

      expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(15)
      expect(store.get(editorSessionStateAtom).draftProfile).toBeNull()
      expect(store.get(editorSessionStateAtom).past).toEqual([initial])
      expect(committed).toHaveBeenCalledOnce()
      fireEvent.blur(window)
      fireEvent.blur(range)
      fireEvent.keyUp(range, { key: 'ArrowRight' })
      expect(committed).toHaveBeenCalledOnce()
      act(() => createStyleHistoryCommands(store).undoYLCStyle())
      expect(store.get(chatSettingsStateAtom).profile).toEqual(initial)
    } finally {
      unsubscribe()
    }
  })

  it('removes its window blur handler after unmount', () => {
    const store = createTestStore()
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={vi.fn()} />, store)
    view.unmount()
    const { beginYLCStyleGesture, previewYLCStyleUpdate } = createStyleHistoryCommands(store)
    beginYLCStyleGesture('range:fontSize', 'fontSize')
    previewYLCStyleUpdate('range:fontSize', { appearance: { fontSize: 15 } }, 'fontSize')

    fireEvent.blur(window)

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(13)
    expect(store.get(editorSessionStateAtom).draftProfile?.appearance.fontSize).toBe(15)
  })
})
