import { act, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom, editorSessionStateAtom } from '@/shared/state/atoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { createStyleHistoryCommands } from '../styleHistoryCommands'
import { YTDLiveChatSetting } from './YTDLiveChatSetting'

const store = createTestStore()
const { commitYLCStyleUpdate } = createStyleHistoryCommands(store)
const resetStores = () => {
  store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)
  store.set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null })
}

describe('YTDLiveChatSetting history controls', () => {
  beforeEach(resetStores)

  it('handles macOS and Windows undo/redo shortcuts only from inside the open panel', () => {
    const originalFontSize = store.get(chatSettingsStateAtom).profile.appearance.fontSize
    const { getByRole } = renderWithStore(<YTDLiveChatSetting open onOpenChange={vi.fn()} />, store)
    const panel = document.querySelector('.ylc-setting-panel') as HTMLElement
    const settingsTab = getByRole('tab', { name: 'content.setting.header.setting' })

    commitYLCStyleUpdate({ appearance: { fontSize: originalFontSize + 3 } }, 'fontSize')
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true })
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(originalFontSize + 3)

    fireEvent.keyDown(settingsTab, { key: 'z', metaKey: true })
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(originalFontSize)
    expect(getByRole('button', { name: 'content.setting.header.redo' })).not.toBeDisabled()

    fireEvent.keyDown(panel, { key: 'z', metaKey: true, shiftKey: true })
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(originalFontSize + 3)

    fireEvent.keyDown(panel, { key: 'z', ctrlKey: true })
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(originalFontSize)
    fireEvent.keyDown(panel, { key: 'y', ctrlKey: true })
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(originalFontSize + 3)
  })

  it('leaves native text-input undo and IME events untouched', () => {
    const originalFontSize = store.get(chatSettingsStateAtom).profile.appearance.fontSize
    const { getByRole, getByTestId } = renderWithStore(<YTDLiveChatSetting open onOpenChange={vi.fn()} />, store)
    commitYLCStyleUpdate({ appearance: { fontSize: originalFontSize + 2 } }, 'fontSize')

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    const input = getByTestId('font-family-search')
    fireEvent.keyDown(input, { key: 'z', metaKey: true })
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(originalFontSize + 2)
    expect(store.get(editorSessionStateAtom).past).toHaveLength(1)

    fireEvent.keyDown(getByRole('tab', { name: 'content.setting.header.setting' }), {
      key: 'z',
      metaKey: true,
      isComposing: true,
    })
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(originalFontSize + 2)
  })

  it('exposes disabled undo and redo buttons until matching history exists', () => {
    const originalBlur = store.get(chatSettingsStateAtom).profile.appearance.blur
    const { getByRole } = renderWithStore(<YTDLiveChatSetting open onOpenChange={vi.fn()} />, store)
    const undoButton = getByRole('button', { name: 'content.setting.header.undo' })
    const redoButton = getByRole('button', { name: 'content.setting.header.redo' })

    expect(undoButton).toBeDisabled()
    expect(redoButton).toBeDisabled()
    expect(undoButton).toHaveAttribute('aria-keyshortcuts', 'Meta+Z Control+Z')

    act(() => {
      commitYLCStyleUpdate({ appearance: { blur: originalBlur + 1 } }, 'blur')
    })
    expect(undoButton).not.toBeDisabled()
    fireEvent.click(undoButton)
    expect(store.get(chatSettingsStateAtom).profile.appearance.blur).toBe(originalBlur)
    expect(redoButton).not.toBeDisabled()
    expect(getByRole('status')).toHaveTextContent('content.setting.header.undo')
  })

  it('refreshes the live-region node for consecutive undo announcements', () => {
    const originalBlur = store.get(chatSettingsStateAtom).profile.appearance.blur
    const { getByRole } = renderWithStore(<YTDLiveChatSetting open onOpenChange={vi.fn()} />, store)
    const undoButton = getByRole('button', { name: 'content.setting.header.undo' })

    act(() => {
      commitYLCStyleUpdate({ appearance: { blur: originalBlur + 1 } }, 'blur')
      commitYLCStyleUpdate({ appearance: { blur: originalBlur + 2 } }, 'blur')
    })

    fireEvent.click(undoButton)
    const firstAnnouncement = getByRole('status')
    expect(firstAnnouncement).toHaveTextContent('content.setting.header.undo')

    fireEvent.click(undoButton)
    expect(getByRole('status')).not.toBe(firstAnnouncement)
    expect(getByRole('status')).toHaveTextContent('content.setting.header.undo')
  })

  it('consumes recognized shortcuts inside the panel even when history is empty', () => {
    const { getByRole } = renderWithStore(<YTDLiveChatSetting open onOpenChange={vi.fn()} />, store)
    const settingsTab = getByRole('tab', { name: 'content.setting.header.setting' })
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })

    settingsTab.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(store.get(editorSessionStateAtom).past).toHaveLength(0)
  })

  it('focuses the active tab on open and requests close with Escape', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const { getByRole } = renderWithStore(<YTDLiveChatSetting open onOpenChange={onOpenChange} />, store)
    const settingsTab = getByRole('tab', { name: 'content.setting.header.setting' })

    await waitFor(() => expect(settingsTab).toHaveFocus())
    await user.keyboard('{Escape}')

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
