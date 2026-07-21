import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_HEADER_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_INPUT_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_RESTRICTED_PARTICIPATION_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_TRANSITION_CLASS,
} from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { ChatOnlyChromeEffect } from './ChatOnlyChromeEffect'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

const baseLiveState = useYTDLiveChatStore.getState()
const baseNoLsState = useYTDLiveChatNoLsStore.getState()

const resetStores = ({
  liveOverrides = {},
  noLsOverrides = {},
}: {
  liveOverrides?: Partial<typeof baseLiveState>
  noLsOverrides?: Partial<typeof baseNoLsState>
} = {}) => {
  useYTDLiveChatStore.setState(
    {
      ...baseLiveState,
      ...liveOverrides,
      coordinates: { ...baseLiveState.coordinates, ...(liveOverrides.coordinates ?? {}) },
      size: { ...baseLiveState.size, ...(liveOverrides.size ?? {}) },
      presetItemIds: [...baseLiveState.presetItemIds],
      presetItemStyles: { ...baseLiveState.presetItemStyles },
      presetItemTitles: { ...baseLiveState.presetItemTitles },
    },
    true,
  )

  useYTDLiveChatNoLsStore.setState(
    {
      ...baseNoLsState,
      ...noLsOverrides,
    },
    true,
  )
}

const createIframe = () => {
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  const doc = document.implementation.createHTMLDocument('')

  Object.defineProperty(iframe, 'contentDocument', {
    value: doc,
    configurable: true,
  })

  return iframe
}

const appendMeasuredChrome = (doc: Document) => {
  const header = doc.createElement('yt-live-chat-header-renderer')
  const input = doc.createElement('yt-live-chat-message-input-renderer')
  const restricted = doc.createElement('yt-live-chat-restricted-participation-renderer')
  Object.defineProperty(header, 'scrollHeight', { value: 54, configurable: true })
  Object.defineProperty(input, 'scrollHeight', { value: 112, configurable: true })
  Object.defineProperty(restricted, 'scrollHeight', { value: 48, configurable: true })
  doc.body.append(header, input, restricted)
}

const setupChatOnlyState = ({
  isHover = false,
  isChatOnlyChromeHidden = undefined,
  iframe = createIframe(),
}: {
  isHover?: boolean
  isChatOnlyChromeHidden?: boolean | undefined
  iframe?: HTMLIFrameElement
} = {}) => {
  resetStores({
    liveOverrides: {
      coordinates: { x: 10, y: 20 },
      size: { width: 300, height: 200 },
      alwaysOnDisplay: true,
      chatOnlyDisplay: true,
    },
    noLsOverrides: {
      isIframeLoaded: true,
      isHover,
      isOpenSettingModal: false,
      isChatOnlyChromeHidden,
      iframeElement: iframe,
    },
  })

  return iframe
}

describe('ChatOnlyChromeEffect', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetStores()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('enables chat-only chrome hiding without changing panel geometry', async () => {
    const iframe = setupChatOnlyState()

    render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    const liveState = useYTDLiveChatStore.getState()
    const noLsState = useYTDLiveChatNoLsStore.getState()

    expect(noLsState.isChatOnlyChromeHidden).toBe(true)
    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    expect(liveState.coordinates).toEqual({ x: 10, y: 20 })
    expect(liveState.size).toEqual({ width: 300, height: 200 })
  })

  it('stores measured chrome heights while the chat-only transition is active', async () => {
    const iframe = setupChatOnlyState()
    appendMeasuredChrome(iframe.contentDocument as Document)

    render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    const body = iframe.contentDocument?.body
    expect(body?.classList.contains(IFRAME_CHAT_ONLY_TRANSITION_CLASS)).toBe(true)
    expect(body?.style.getPropertyValue(IFRAME_CHAT_ONLY_HEADER_HEIGHT_VAR)).toBe('54px')
    expect(body?.style.getPropertyValue(IFRAME_CHAT_ONLY_INPUT_HEIGHT_VAR)).toBe('112px')
    expect(body?.style.getPropertyValue(IFRAME_CHAT_ONLY_RESTRICTED_PARTICIPATION_HEIGHT_VAR)).toBe('48px')
  })

  it('stores zero-height chrome metrics without falling back to artificial heights', async () => {
    const iframe = setupChatOnlyState()
    const header = iframe.contentDocument?.createElement('yt-live-chat-header-renderer') as HTMLElement
    Object.defineProperty(header, 'scrollHeight', { value: 0, configurable: true })
    iframe.contentDocument?.body.append(header)

    render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(iframe.contentDocument?.body.style.getPropertyValue(IFRAME_CHAT_ONLY_HEADER_HEIGHT_VAR)).toBe('0px')
  })

  it('keeps chat-only chrome visible while the external controls are fading out', () => {
    setupChatOnlyState({ isChatOnlyChromeHidden: false })

    render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} isControlRailHiding />)

    act(() => {
      vi.advanceTimersByTime(20)
    })

    expect(useYTDLiveChatNoLsStore.getState().isChatOnlyChromeHidden).toBe(false)
  })

  it('keeps chat-only chrome visible while dragging or resizing', () => {
    setupChatOnlyState({ isChatOnlyChromeHidden: false })
    const { rerender } = render(<ChatOnlyChromeEffect isDragging isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    expect(useYTDLiveChatNoLsStore.getState().isChatOnlyChromeHidden).toBe(false)

    rerender(<ChatOnlyChromeEffect isDragging={false} isResizing />)
    act(() => {
      vi.advanceTimersByTime(20)
    })
    expect(useYTDLiveChatNoLsStore.getState().isChatOnlyChromeHidden).toBe(false)
  })

  it('removes focus from the iframe when chat-only chrome hiding is enabled', async () => {
    const iframe = setupChatOnlyState()
    const activeElement = iframe.contentDocument?.createElement('button') as HTMLButtonElement
    const blur = vi.spyOn(activeElement, 'blur')
    Object.defineProperty(iframe.contentDocument, 'activeElement', {
      value: activeElement,
      configurable: true,
    })

    render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(blur).toHaveBeenCalledTimes(1)
  })

  it('auto-hides chrome after load even when hover is initially true', async () => {
    setupChatOnlyState({ isHover: true })

    render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(120)
    })
    await act(async () => {
      await Promise.resolve()
    })
    act(() => {
      vi.advanceTimersByTime(40)
    })
    await act(async () => {
      await Promise.resolve()
    })

    const noLsState = useYTDLiveChatNoLsStore.getState()
    expect(noLsState.isHover).toBe(false)
    expect(noLsState.isChatOnlyChromeHidden).toBe(true)
  })

  it('toggles iframe chrome hiding with hover', async () => {
    const iframe = setupChatOnlyState()

    render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)

    act(() => {
      useYTDLiveChatNoLsStore.getState().setIsHover(true)
    })
    await act(async () => {
      await Promise.resolve()
    })
    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_TRANSITION_CLASS)).toBe(false)
    expect(iframe.contentDocument?.body.style.getPropertyValue(IFRAME_CHAT_ONLY_HEADER_HEIGHT_VAR)).toBe('')
  })

  it('remeasures chrome before revealing chat-only controls', async () => {
    const iframe = setupChatOnlyState()

    render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    const restricted = iframe.contentDocument?.createElement('yt-live-chat-restricted-participation-renderer') as HTMLElement
    Object.defineProperty(restricted, 'scrollHeight', { value: 64, configurable: true })
    iframe.contentDocument?.body.append(restricted)

    act(() => {
      useYTDLiveChatNoLsStore.getState().setIsHover(true)
    })
    await act(async () => {
      await Promise.resolve()
    })
    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    expect(iframe.contentDocument?.body.style.getPropertyValue(IFRAME_CHAT_ONLY_RESTRICTED_PARTICIPATION_HEIGHT_VAR)).toBe('64px')
  })

  it('cleans up iframe chrome hiding on unmount', async () => {
    const iframe = setupChatOnlyState()
    const { unmount } = render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)

    unmount()

    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    expect(useYTDLiveChatNoLsStore.getState().isHover).toBe(false)
  })
})
