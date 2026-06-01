import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatStore } from '@/shared/stores'
import { useYTDLiveChatNoLsStore } from '@/shared/stores/ytdLiveChatNoLsStore'
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
    useYTDLiveChatNoLsStore.setState({ iframeElement: null })
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

  it('renders settings in the expected order without removed reaction button setting', () => {
    resetStore({ alwaysOnDisplay: true })

    const { container } = render(<SettingContent />)

    const labels = Array.from(container.querySelectorAll('p')).map(label => label.textContent)
    expect(labels).toEqual([
      'content.setting.alwaysOnDisplay',
      'content.setting.chatOnlyDisplay',
      'content.setting.backgroundColor',
      'content.setting.fontColor',
      'content.setting.fontFamily',
      'content.setting.fontSize',
      'content.setting.blur',
      'content.setting.space',
      'content.setting.userNameDisplay',
      'content.setting.userIconDisplay',
      'content.setting.superChatBarDisplay',
    ])
    expect(labels).not.toContain('content.setting.reactionButtonDisplay')
  })

  it('keeps color pickers in sync with store updates', () => {
    const { getByText } = render(<SettingContent />)

    act(() => {
      useYTDLiveChatStore.setState({
        bgColor: { r: 1, g: 2, b: 3, a: 0.4 },
        fontColor: { r: 9, g: 8, b: 7, a: 0.6 },
      })
    })

    expect(getByText('Current color: rgba(1, 2, 3, 0.4)')).not.toBeNull()
    expect(getByText('Current color: rgba(9, 8, 7, 0.6)')).not.toBeNull()
  })

  it('keeps sliders in sync with store updates before interaction', () => {
    const { getByRole } = render(<SettingContent />)

    act(() => {
      useYTDLiveChatStore.setState({
        fontSize: 30,
        blur: 12,
        space: 24,
      })
    })

    expect(getByRole('slider', { name: 'content.setting.fontSize' }).getAttribute('aria-valuetext')).toBe('30px')
    expect(getByRole('slider', { name: 'content.setting.blur' }).getAttribute('aria-valuetext')).toBe('12px')
    expect(getByRole('slider', { name: 'content.setting.space' }).getAttribute('aria-valuetext')).toBe('24px')
  })

  it('updates display CSS variables when display toggles are clicked', () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    const { getByRole } = render(<SettingContent />)

    fireEvent.click(getByRole('switch', { name: 'content.setting.userNameDisplay' }))
    fireEvent.click(getByRole('switch', { name: 'content.setting.userIconDisplay' }))
    fireEvent.click(getByRole('switch', { name: 'content.setting.superChatBarDisplay' }))

    const style = iframe.contentDocument?.documentElement.style
    expect(style?.getPropertyValue('--extension-user-name-display')).toBe('none')
    expect(style?.getPropertyValue('--extension-user-icon-display')).toBe('none')
    expect(style?.getPropertyValue('--extension-super-chat-bar-display')).toBe('none')

    fireEvent.click(getByRole('switch', { name: 'content.setting.superChatBarDisplay' }))
    expect(style?.getPropertyValue('--extension-super-chat-bar-display')).toBe('block')
  })
})
