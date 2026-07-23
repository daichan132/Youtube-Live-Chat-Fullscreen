import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatStore } from '@/shared/stores'
import { useYTDLiveChatNoLsStore } from '@/shared/stores/ytdLiveChatNoLsStore'
import { useYLCStyleApplication } from '../../../hooks/ylcStyleChange/useYLCStyleApplication'
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

const SettingContentWithApplication = () => {
  useYLCStyleApplication()
  return <SettingContent />
}

describe('SettingContent', () => {
  beforeEach(() => {
    resetStore({ alwaysOnDisplay: false, chatOnlyDisplay: false })
    useYTDLiveChatNoLsStore.setState({ iframeElement: null })
  })

  it('locks chat-only display until always-on display is enabled', () => {
    const { getByText, getByRole } = render(<SettingContent />)

    const chatOnlyRow = getByText('content.setting.chatOnlyDisplay').closest('.ylc-row') as HTMLElement
    expect(chatOnlyRow.className).toContain('is-disabled')
    expect(chatOnlyRow.querySelector('[role="switch"]')).toBeDisabled()

    fireEvent.click(getByRole('switch', { name: 'content.setting.alwaysOnDisplay' }))

    expect(useYTDLiveChatStore.getState().alwaysOnDisplay).toBe(true)
    const updatedChatOnlyRow = getByText('content.setting.chatOnlyDisplay').closest('.ylc-row') as HTMLElement
    expect(updatedChatOnlyRow.className).not.toContain('is-disabled')
    expect(updatedChatOnlyRow.querySelector('[role="switch"]')).not.toBeDisabled()
  })

  it('renders settings in the expected order without removed reaction button setting', () => {
    resetStore({ alwaysOnDisplay: true })

    const { container } = render(<SettingContent />)

    const labels = Array.from(container.querySelectorAll('.ylc-row-title')).map(label => label.textContent)
    expect(labels).toEqual([
      'content.setting.alwaysOnDisplay',
      'content.setting.chatOnlyDisplay',
      'content.setting.backgroundColor',
      'content.setting.fontColor',
      'content.setting.membershipNameColor',
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
        membershipNameColor: { r: 15, g: 157, b: 88, a: 1 },
      })
    })

    expect(getByText('Current color: rgba(1, 2, 3, 0.4)')).not.toBeNull()
    expect(getByText('Current color: rgba(9, 8, 7, 0.6)')).not.toBeNull()
    expect(getByText('Current color: rgba(15, 157, 88, 1)')).not.toBeNull()
  })

  it('keeps sliders in sync with store updates before interaction', () => {
    const { getByRole } = render(<SettingContentWithApplication />)

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

    const { getByRole } = render(<SettingContentWithApplication />)

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

  it('keeps membership name color visible and resets it to the default color', () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    iframe.contentDocument?.documentElement.style.setProperty('--yt-live-chat-sponsor-color', 'rgb(22, 163, 74)')
    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    const { getByRole, queryByText } = render(<SettingContentWithApplication />)

    expect(useYTDLiveChatStore.getState().membershipNameColor).toEqual({ r: 15, g: 157, b: 88, a: 1 })
    expect(queryByText('Current color: rgba(15, 157, 88, 1)')).not.toBeNull()
    const resetButton = getByRole('button', { name: 'content.setting.resetToDefaultColor' })
    expect(resetButton).toBeDisabled()
    expect(resetButton.parentElement?.getAttribute('data-tooltip')).toBe('content.setting.resetToDefaultColor')

    fireEvent.click(getByRole('button', { name: 'content.setting.membershipNameColor' }))

    const colorPicker = document.querySelector('.react-colorful') as HTMLElement
    expect(colorPicker).not.toBeNull()

    act(() => {
      useYTDLiveChatStore.setState({ membershipNameColor: { r: 1, g: 2, b: 3, a: 0.4 } })
    })

    expect(queryByText('Current color: rgba(1, 2, 3, 0.4)')).not.toBeNull()
    expect(getByRole('button', { name: 'content.setting.resetToDefaultColor' })).not.toBeDisabled()

    fireEvent.click(getByRole('button', { name: 'content.setting.resetToDefaultColor' }))

    expect(useYTDLiveChatStore.getState().membershipNameColor).toEqual({ r: 22, g: 163, b: 74, a: 1 })
    expect(iframe.contentDocument?.documentElement.style.getPropertyValue('--extension-yt-live-membership-name-color')).toBe(
      'rgba(22, 163, 74, 1)',
    )
  })
})
