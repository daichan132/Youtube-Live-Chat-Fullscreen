import { render } from '@testing-library/react'
import { Provider } from 'jotai'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { chatSettingsStateAtom, editorSessionStateAtom } from '@/shared/state/atoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { ChatViewport } from './ChatViewport'

vi.mock('../runtime/ChatRuntimeContext', () => ({
  useChatRuntimeInstance: () => ({
    setOverlayContainer: vi.fn(),
  }),
}))

describe('ChatViewport', () => {
  const store = createTestStore()
  beforeEach(() => {
    store.set(chatSettingsStateAtom, { ...store.get(chatSettingsStateAtom), profile: DEFAULT_CHAT_PROFILE })
    store.set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null })
  })

  it('previews the editor draft without persisting it first', () => {
    store.set(editorSessionStateAtom, {
      draftProfile: {
        ...DEFAULT_CHAT_PROFILE,
        appearance: {
          ...DEFAULT_CHAT_PROFILE.appearance,
          backgroundColor: { r: 10, g: 20, b: 30, a: 0.4 },
        },
      },
      past: [],
      future: [],
      activeGesture: null,
    })

    const { container } = renderWithStore(<ChatViewport loading={false} visible />, store)

    expect(container.querySelector<HTMLElement>('[data-ylc-chat-background]')?.style.backgroundColor).toBe('rgba(10, 20, 30, 0.4)')
    expect(store.get(chatSettingsStateAtom).profile.appearance.backgroundColor).toEqual(DEFAULT_CHAT_PROFILE.appearance.backgroundColor)
  })

  it('announces the wait as live-region content that outlives the spinner', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>
    const { container, rerender } = render(<ChatViewport loading={false} visible={false} />, { wrapper })
    const region = container.querySelector('output')

    expect(region).not.toBeNull()
    expect(region?.textContent).toBe('')
    expect(region?.getAttribute('aria-label')).toBeNull()

    rerender(<ChatViewport loading visible={false} />)

    expect(container.querySelector('output')).toBe(region)
    expect(region?.textContent).toBe('content.aria.loading')
    expect(container.querySelector('[data-ylc-loading-overlay]')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('applies configured blur only to the bounded chat background layer', () => {
    store.set(chatSettingsStateAtom, {
      ...store.get(chatSettingsStateAtom),
      profile: {
        ...DEFAULT_CHAT_PROFILE,
        appearance: {
          ...DEFAULT_CHAT_PROFILE.appearance,
          blur: 12,
        },
      },
    })

    const { container } = renderWithStore(<ChatViewport loading={false} visible />, store)
    const background = container.querySelector<HTMLElement>('[data-ylc-chat-background]')

    expect(background?.style.backdropFilter).toBe('blur(12px)')
  })
})
