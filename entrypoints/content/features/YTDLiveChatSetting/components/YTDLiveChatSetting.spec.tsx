import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatEditorStore } from '@/entrypoints/content/settings/ChatEditorStore'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { commitYLCStyleUpdate } from '../styleHistoryCommands'
import { YTDLiveChatSetting } from './YTDLiveChatSetting'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

const resetStores = () => {
  useChatSettingsStore.setState(DEFAULT_CHAT_SETTINGS)
  useChatEditorStore.getState().clear()
}

describe('YTDLiveChatSetting history controls', () => {
  beforeEach(resetStores)

  it('handles macOS and Windows undo/redo shortcuts only from inside the open panel', () => {
    const originalFontSize = useChatSettingsStore.getState().profile.appearance.fontSize
    const { getByRole } = render(<YTDLiveChatSetting open onOpenChange={vi.fn()} />)
    const panel = document.querySelector('.ylc-setting-panel') as HTMLElement
    const settingsTab = getByRole('tab', { name: 'content.setting.header.setting' })

    commitYLCStyleUpdate({ appearance: { fontSize: originalFontSize + 3 } }, 'fontSize')
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true })
    expect(useChatSettingsStore.getState().profile.appearance.fontSize).toBe(originalFontSize + 3)

    fireEvent.keyDown(settingsTab, { key: 'z', metaKey: true })
    expect(useChatSettingsStore.getState().profile.appearance.fontSize).toBe(originalFontSize)
    expect(getByRole('button', { name: 'content.setting.header.redo' })).not.toBeDisabled()

    fireEvent.keyDown(panel, { key: 'z', metaKey: true, shiftKey: true })
    expect(useChatSettingsStore.getState().profile.appearance.fontSize).toBe(originalFontSize + 3)

    fireEvent.keyDown(panel, { key: 'z', ctrlKey: true })
    expect(useChatSettingsStore.getState().profile.appearance.fontSize).toBe(originalFontSize)
    fireEvent.keyDown(panel, { key: 'y', ctrlKey: true })
    expect(useChatSettingsStore.getState().profile.appearance.fontSize).toBe(originalFontSize + 3)
  })

  it('leaves native text-input undo and IME events untouched', () => {
    const originalFontSize = useChatSettingsStore.getState().profile.appearance.fontSize
    const { getByRole, getByTestId } = render(<YTDLiveChatSetting open onOpenChange={vi.fn()} />)
    commitYLCStyleUpdate({ appearance: { fontSize: originalFontSize + 2 } }, 'fontSize')

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    const input = getByTestId('font-family-search')
    fireEvent.keyDown(input, { key: 'z', metaKey: true })
    expect(useChatSettingsStore.getState().profile.appearance.fontSize).toBe(originalFontSize + 2)
    expect(useChatEditorStore.getState().past).toHaveLength(1)

    fireEvent.keyDown(getByRole('tab', { name: 'content.setting.header.setting' }), {
      key: 'z',
      metaKey: true,
      isComposing: true,
    })
    expect(useChatSettingsStore.getState().profile.appearance.fontSize).toBe(originalFontSize + 2)
  })

  it('exposes disabled undo and redo buttons until matching history exists', () => {
    const originalBlur = useChatSettingsStore.getState().profile.appearance.blur
    const { getByRole } = render(<YTDLiveChatSetting open onOpenChange={vi.fn()} />)
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
    expect(useChatSettingsStore.getState().profile.appearance.blur).toBe(originalBlur)
    expect(redoButton).not.toBeDisabled()
    expect(getByRole('status')).toHaveTextContent('content.setting.header.undo')
  })

  it('refreshes the live-region node for consecutive undo announcements', () => {
    const originalBlur = useChatSettingsStore.getState().profile.appearance.blur
    const { getByRole } = render(<YTDLiveChatSetting open onOpenChange={vi.fn()} />)
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
    const { getByRole } = render(<YTDLiveChatSetting open onOpenChange={vi.fn()} />)
    const settingsTab = getByRole('tab', { name: 'content.setting.header.setting' })
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })

    settingsTab.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(useChatEditorStore.getState().past).toHaveLength(0)
  })
})
