import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IFRAME_CHAT_ONLY_CLASS } from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
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
  const header = doc.createElement('yt-live-chat-header-renderer')
  const inputPanel = doc.createElement('div')
  inputPanel.id = 'input-panel'
  doc.body.append(header, inputPanel)

  Object.defineProperty(header, 'getBoundingClientRect', {
    value: () => ({ height: 54 }) as DOMRect,
  })
  Object.defineProperty(inputPanel, 'getBoundingClientRect', {
    value: () => ({ height: 112 }) as DOMRect,
  })
  Object.defineProperty(iframe, 'contentDocument', {
    value: doc,
    configurable: true,
  })

  return iframe
}

const setupChatOnlyState = ({ isHover = false, iframe = createIframe() }: { isHover?: boolean; iframe?: HTMLIFrameElement } = {}) => {
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

  it('hides iframe chrome without changing panel geometry', () => {
    const iframe = setupChatOnlyState()

    render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} />)

    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 10, y: 20 })
    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 300, height: 200 })
  })

  it('shows and hides iframe chrome with hover', () => {
    const iframe = setupChatOnlyState()
    render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} />)

    act(() => useYTDLiveChatNoLsStore.getState().setIsHover(true))
    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)

    act(() => useYTDLiveChatNoLsStore.getState().setIsHover(false))
    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
  })

  it('holds the previous chrome state while dragging, resizing, or hiding the control rail', () => {
    const iframe = setupChatOnlyState()
    const { rerender } = render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} />)

    act(() => useYTDLiveChatNoLsStore.getState().setIsHover(true))
    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)

    rerender(<ChatOnlyChromeEffect isDragging isResizing={false} />)
    act(() => useYTDLiveChatNoLsStore.getState().setIsHover(false))
    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)

    rerender(<ChatOnlyChromeEffect isDragging={false} isResizing />)
    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)

    rerender(<ChatOnlyChromeEffect isDragging={false} isResizing={false} isControlRailHiding />)
    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
  })

  it('removes focus when chrome collapses', () => {
    const iframe = setupChatOnlyState()
    const activeElement = iframe.contentDocument?.createElement('button') as HTMLButtonElement
    const blur = vi.spyOn(activeElement, 'blur')
    Object.defineProperty(iframe.contentDocument, 'activeElement', {
      value: activeElement,
      configurable: true,
    })

    render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} />)

    expect(blur).toHaveBeenCalledTimes(1)
  })

  it('clears hover once when a new iframe Document is bound', () => {
    setupChatOnlyState({ isHover: true })

    render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} />)

    expect(useYTDLiveChatNoLsStore.getState().isHover).toBe(false)
  })

  it('cleans the bound Document on unmount', () => {
    const iframe = setupChatOnlyState()
    const { unmount } = render(<ChatOnlyChromeEffect isDragging={false} isResizing={false} />)
    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)

    unmount()

    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    expect(useYTDLiveChatNoLsStore.getState().isHover).toBe(false)
  })
})
