import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatHistoryStore } from '@/shared/stores/ytdLiveChatHistoryStore'
import { useYTDLiveChatNoLsStore } from '@/shared/stores/ytdLiveChatNoLsStore'
import { useYTDLiveChatStore } from '@/shared/stores/ytdLiveChatStore'
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

const initialStyle = useYTDLiveChatStore.getState()

const resetStores = () => {
  useYTDLiveChatStore.setState(
    {
      ...initialStyle,
      bgColor: { ...initialStyle.bgColor },
      fontColor: { ...initialStyle.fontColor },
      membershipNameColor: { ...initialStyle.membershipNameColor },
      coordinates: { ...initialStyle.coordinates },
      size: { ...initialStyle.size },
      presetItemIds: [...initialStyle.presetItemIds],
      presetItemStyles: { ...initialStyle.presetItemStyles },
      presetItemTitles: { ...initialStyle.presetItemTitles },
    },
    true,
  )
  useYTDLiveChatHistoryStore.getState().clear()
  useYTDLiveChatNoLsStore.setState({
    isOpenSettingModal: true,
    isHover: true,
    menuItem: 'setting',
  })
}

describe('YTDLiveChatSetting history controls', () => {
  beforeEach(resetStores)

  it('handles macOS and Windows undo/redo shortcuts only from inside the open panel', () => {
    const originalFontSize = useYTDLiveChatStore.getState().fontSize
    const { getByRole } = render(<YTDLiveChatSetting />)
    const panel = document.querySelector('.ylc-setting-panel') as HTMLElement
    const settingsTab = getByRole('tab', { name: 'content.setting.header.setting' })

    commitYLCStyleUpdate({ fontSize: originalFontSize + 3 }, 'fontSize')
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true })
    expect(useYTDLiveChatStore.getState().fontSize).toBe(originalFontSize + 3)

    fireEvent.keyDown(settingsTab, { key: 'z', metaKey: true })
    expect(useYTDLiveChatStore.getState().fontSize).toBe(originalFontSize)
    expect(getByRole('button', { name: 'content.setting.header.redo' })).not.toBeDisabled()

    fireEvent.keyDown(panel, { key: 'z', metaKey: true, shiftKey: true })
    expect(useYTDLiveChatStore.getState().fontSize).toBe(originalFontSize + 3)

    fireEvent.keyDown(panel, { key: 'z', ctrlKey: true })
    expect(useYTDLiveChatStore.getState().fontSize).toBe(originalFontSize)
    fireEvent.keyDown(panel, { key: 'y', ctrlKey: true })
    expect(useYTDLiveChatStore.getState().fontSize).toBe(originalFontSize + 3)
  })

  it('leaves native text-input undo and IME events untouched', () => {
    const originalFontSize = useYTDLiveChatStore.getState().fontSize
    const { getByRole, getByTestId } = render(<YTDLiveChatSetting />)
    commitYLCStyleUpdate({ fontSize: originalFontSize + 2 }, 'fontSize')

    fireEvent.click(getByRole('button', { name: 'content.setting.fontFamily' }))
    const input = getByTestId('font-family-search')
    fireEvent.keyDown(input, { key: 'z', metaKey: true })
    expect(useYTDLiveChatStore.getState().fontSize).toBe(originalFontSize + 2)
    expect(useYTDLiveChatHistoryStore.getState().past).toHaveLength(1)

    fireEvent.keyDown(getByRole('tab', { name: 'content.setting.header.setting' }), {
      key: 'z',
      metaKey: true,
      isComposing: true,
    })
    expect(useYTDLiveChatStore.getState().fontSize).toBe(originalFontSize + 2)
  })

  it('exposes disabled undo and redo buttons until matching history exists', () => {
    const originalBlur = useYTDLiveChatStore.getState().blur
    const { getByRole } = render(<YTDLiveChatSetting />)
    const undoButton = getByRole('button', { name: 'content.setting.header.undo' })
    const redoButton = getByRole('button', { name: 'content.setting.header.redo' })

    expect(undoButton).toBeDisabled()
    expect(redoButton).toBeDisabled()
    expect(undoButton).toHaveAttribute('aria-keyshortcuts', 'Meta+Z Control+Z')

    act(() => {
      commitYLCStyleUpdate({ blur: originalBlur + 1 }, 'blur')
    })
    expect(undoButton).not.toBeDisabled()
    fireEvent.click(undoButton)
    expect(useYTDLiveChatStore.getState().blur).toBe(originalBlur)
    expect(redoButton).not.toBeDisabled()
    expect(getByRole('status')).toHaveTextContent('content.setting.header.undo')
  })

  it('refreshes the live-region node for consecutive undo announcements', () => {
    const originalBlur = useYTDLiveChatStore.getState().blur
    const { getByRole } = render(<YTDLiveChatSetting />)
    const undoButton = getByRole('button', { name: 'content.setting.header.undo' })

    act(() => {
      commitYLCStyleUpdate({ blur: originalBlur + 1 }, 'blur')
      commitYLCStyleUpdate({ blur: originalBlur + 2 }, 'blur')
    })

    fireEvent.click(undoButton)
    const firstAnnouncement = getByRole('status')
    expect(firstAnnouncement).toHaveTextContent('content.setting.header.undo')

    fireEvent.click(undoButton)
    expect(getByRole('status')).not.toBe(firstAnnouncement)
    expect(getByRole('status')).toHaveTextContent('content.setting.header.undo')
  })

  it('consumes recognized shortcuts inside the panel even when history is empty', () => {
    const { getByRole } = render(<YTDLiveChatSetting />)
    const settingsTab = getByRole('tab', { name: 'content.setting.header.setting' })
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })

    settingsTab.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(useYTDLiveChatHistoryStore.getState().past).toHaveLength(0)
  })
})
