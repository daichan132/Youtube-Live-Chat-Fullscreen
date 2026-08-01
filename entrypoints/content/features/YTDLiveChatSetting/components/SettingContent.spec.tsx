import { act, fireEvent } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { SettingContent } from './SettingContent'

describe('SettingContent', () => {
  const store = createStore()
  beforeEach(() => {
    store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)
  })

  it('only shows chat-only mode while idle display is enabled', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(chatSettingsStateAtom, {
      ...store.get(chatSettingsStateAtom),
      profile: {
        ...profile,
        display: {
          idleVisibility: 'auto-hide',
          contentMode: 'full-chat',
        },
      },
    })
    const { getByRole, queryByRole } = renderWithStore(<SettingContent />, store)

    expect(queryByRole('switch', { name: 'content.setting.chatOnlyDisplay' })).toBeNull()
    fireEvent.click(getByRole('switch', { name: 'content.setting.alwaysOnDisplay' }))
    fireEvent.click(getByRole('switch', { name: 'content.setting.chatOnlyDisplay' }))

    expect(store.get(chatSettingsStateAtom).profile.display).toEqual({
      idleVisibility: 'always-visible',
      contentMode: 'messages-only',
    })

    fireEvent.click(getByRole('switch', { name: 'content.setting.alwaysOnDisplay' }))

    expect(queryByRole('switch', { name: 'content.setting.chatOnlyDisplay' })).toBeNull()
    expect(store.get(chatSettingsStateAtom).profile.display).toEqual({
      idleVisibility: 'auto-hide',
      contentMode: 'messages-only',
    })
  })

  it('renders settings in the expected order without removed settings', () => {
    const { container } = renderWithStore(<SettingContent />, store)

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
    const { getByRole, getByText } = renderWithStore(<SettingContent />, store)
    const profile = store.get(chatSettingsStateAtom).profile

    act(() => {
      store.set(chatSettingsStateAtom, {
        ...store.get(chatSettingsStateAtom),
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
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(chatSettingsStateAtom, {
      ...store.get(chatSettingsStateAtom),
      profile: {
        ...profile,
        appearance: {
          ...profile.appearance,
          membershipNameColor: { mode: 'custom', value: { r: 1, g: 2, b: 3, a: 0.4 } },
        },
      },
    })
    const { getByRole } = renderWithStore(<SettingContent />, store)

    fireEvent.click(getByRole('button', { name: 'content.setting.resetToDefaultColor' }))

    expect(store.get(chatSettingsStateAtom).profile.appearance.membershipNameColor).toEqual({
      mode: 'youtube-default',
    })
  })
})
