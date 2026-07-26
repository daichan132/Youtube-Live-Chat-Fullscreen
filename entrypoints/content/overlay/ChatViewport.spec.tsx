import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatEditorStore } from '@/entrypoints/content/settings/ChatEditorStore'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { ChatViewport } from './ChatViewport'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('../runtime/ChatRuntime', () => ({
  chatRuntime: {
    setOverlayContainer: vi.fn(),
  },
}))

describe('ChatViewport', () => {
  beforeEach(() => {
    useChatSettingsStore.setState({ profile: DEFAULT_CHAT_PROFILE })
    useChatEditorStore.getState().clear()
  })

  it('previews the editor draft without persisting it first', () => {
    useChatEditorStore.getState().setDraftProfile({
      ...DEFAULT_CHAT_PROFILE,
      appearance: {
        ...DEFAULT_CHAT_PROFILE.appearance,
        backgroundColor: { r: 10, g: 20, b: 30, a: 0.4 },
      },
    })

    const { container } = render(<ChatViewport loading={false} visible />)

    expect(container.querySelector<HTMLElement>('[data-ylc-chat-background]')?.style.backgroundColor).toBe('rgba(10, 20, 30, 0.4)')
    expect(useChatSettingsStore.getState().profile.appearance.backgroundColor).toEqual(DEFAULT_CHAT_PROFILE.appearance.backgroundColor)
  })

  it('keeps configured blur off the parent-page background layer', () => {
    useChatSettingsStore.setState({
      profile: {
        ...DEFAULT_CHAT_PROFILE,
        appearance: {
          ...DEFAULT_CHAT_PROFILE.appearance,
          blur: 12,
        },
      },
    })

    const { container } = render(<ChatViewport loading={false} visible />)
    const background = container.querySelector<HTMLElement>('[data-ylc-chat-background]')

    expect(background?.style.backdropFilter).toBe('')
    expect(background?.style.getPropertyValue('-webkit-backdrop-filter')).toBe('')
  })
})
