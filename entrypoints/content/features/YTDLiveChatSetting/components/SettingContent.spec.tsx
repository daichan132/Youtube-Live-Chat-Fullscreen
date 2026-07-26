import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
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

describe('SettingContent', () => {
  beforeEach(() => {
    useChatSettingsStore.setState(DEFAULT_CHAT_SETTINGS)
  })

  it('updates idle visibility and content mode independently', () => {
    const profile = useChatSettingsStore.getState().profile
    useChatSettingsStore.setState({
      profile: {
        ...profile,
        display: {
          idleVisibility: 'auto-hide',
          contentMode: 'full-chat',
        },
      },
    })
    const { getByRole } = render(<SettingContent />)

    fireEvent.click(getByRole('switch', { name: 'content.setting.alwaysOnDisplay' }))
    fireEvent.click(getByRole('switch', { name: 'content.setting.chatOnlyDisplay' }))

    expect(useChatSettingsStore.getState().profile.display).toEqual({
      idleVisibility: 'always-visible',
      contentMode: 'messages-only',
    })
  })

  it('renders settings in the expected order without removed settings', () => {
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

  it('keeps color pickers and sliders in sync with nested profile updates', () => {
    const { getByRole, getByText } = render(<SettingContent />)
    const profile = useChatSettingsStore.getState().profile

    act(() => {
      useChatSettingsStore.setState({
        profile: {
          ...profile,
          appearance: {
            ...profile.appearance,
            backgroundColor: { r: 1, g: 2, b: 3, a: 0.4 },
            fontColor: { r: 9, g: 8, b: 7, a: 0.6 },
            membershipNameColor: { mode: 'custom', value: { r: 4, g: 5, b: 6, a: 0.8 } },
            fontSize: 30,
            blur: 12,
            spacing: 24,
          },
        },
      })
    })

    expect(getByText('Current color: rgba(1, 2, 3, 0.4)')).not.toBeNull()
    expect(getByText('Current color: rgba(9, 8, 7, 0.6)')).not.toBeNull()
    expect(getByText('Current color: rgba(4, 5, 6, 0.8)')).not.toBeNull()
    expect(getByRole('slider', { name: 'content.setting.fontSize' })).toHaveAttribute('aria-valuetext', '30px')
    expect(getByRole('slider', { name: 'content.setting.blur' })).toHaveAttribute('aria-valuetext', '12px')
    expect(getByRole('slider', { name: 'content.setting.space' })).toHaveAttribute('aria-valuetext', '24px')
  })

  it('resets a custom membership name color to YouTube default mode', () => {
    const profile = useChatSettingsStore.getState().profile
    useChatSettingsStore.setState({
      profile: {
        ...profile,
        appearance: {
          ...profile.appearance,
          membershipNameColor: { mode: 'custom', value: { r: 1, g: 2, b: 3, a: 0.4 } },
        },
      },
    })
    const { getByRole } = render(<SettingContent />)

    fireEvent.click(getByRole('button', { name: 'content.setting.resetToDefaultColor' }))

    expect(useChatSettingsStore.getState().profile.appearance.membershipNameColor).toEqual({
      mode: 'youtube-default',
    })
  })
})
