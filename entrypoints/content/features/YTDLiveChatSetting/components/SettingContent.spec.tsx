import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatStore } from '@/shared/stores'
import { SettingContent } from './SettingContent'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

const baseState = useYTDLiveChatStore.getState()

const resetStore = (overrides: Partial<typeof baseState> = {}) => {
  useYTDLiveChatStore.setState(
    {
      ...baseState,
      ...overrides,
      coordinates: { ...baseState.coordinates },
      size: { ...baseState.size },
      presetItemIds: [...baseState.presetItemIds],
      presetItemStyles: { ...baseState.presetItemStyles },
      presetItemTitles: { ...baseState.presetItemTitles },
    },
    true,
  )
}

describe('SettingContent', () => {
  beforeEach(() => {
    resetStore({ alwaysOnDisplay: false, chatOnlyDisplay: false })
  })

  it('reveals chat-only display when always-on display is enabled', () => {
    const { getByText } = render(<SettingContent />)

    const chatOnlyLabel = getByText('content.setting.chatOnlyDisplay')
    const chatOnlyRow = chatOnlyLabel.parentElement?.parentElement as HTMLElement
    expect(chatOnlyRow.className).toContain('pointer-events-none')

    const alwaysOnLabel = getByText('content.setting.alwaysOnDisplay')
    const alwaysOnRow = alwaysOnLabel.parentElement?.parentElement as HTMLElement
    const alwaysOnSwitch = alwaysOnRow.querySelector('[role="switch"]') as HTMLButtonElement

    fireEvent.click(alwaysOnSwitch)

    const updatedChatOnlyRow = getByText('content.setting.chatOnlyDisplay').parentElement?.parentElement as HTMLElement
    expect(useYTDLiveChatStore.getState().alwaysOnDisplay).toBe(true)
    expect(updatedChatOnlyRow.className).not.toContain('pointer-events-none')
  })
})
