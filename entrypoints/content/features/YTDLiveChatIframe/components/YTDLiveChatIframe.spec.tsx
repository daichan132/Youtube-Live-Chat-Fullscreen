import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { YTDLiveChatIframe } from './YTDLiveChatIframe'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('@/entrypoints/content/chat/runtime/useChatIframeLoader', () => ({
  useChatIframeLoader: () => ({ ref: vi.fn() }),
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

describe('YTDLiveChatIframe', () => {
  beforeEach(() => {
    resetStores()
  })

  it('renders the iframe carrier at full visible panel size without crop', () => {
    const { container } = render(<YTDLiveChatIframe mode='live' />)
    const viewport = container.querySelector('[data-ylc-chat-viewport]') as HTMLElement
    const carrier = container.querySelector('[data-ylc-iframe-carrier]') as HTMLElement

    expect(viewport).toHaveClass('overflow-hidden')
    expect(carrier).toHaveClass('inset-0')
    expect(carrier.style.top).toBe('')
    expect(carrier.style.height).toBe('')
  })

  it('hides the persistent background when loaded chat is not visible', () => {
    resetStores({
      liveOverrides: {
        alwaysOnDisplay: false,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isDisplay: false,
      },
    })

    const { container } = render(<YTDLiveChatIframe mode='live' />)
    const background = container.querySelector('[data-ylc-chat-background]') as HTMLElement
    const viewport = container.querySelector('[data-ylc-chat-viewport]') as HTMLElement

    expect(viewport).toHaveStyle({ opacity: '0' })
    expect(background).toHaveStyle({ opacity: '0' })
  })

  it('keeps the persistent background visible while always-on display keeps chat visible', () => {
    resetStores({
      liveOverrides: {
        alwaysOnDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isDisplay: false,
      },
    })

    const { container } = render(<YTDLiveChatIframe mode='live' />)
    const background = container.querySelector('[data-ylc-chat-background]') as HTMLElement
    const viewport = container.querySelector('[data-ylc-chat-viewport]') as HTMLElement

    expect(viewport).toHaveStyle({ opacity: '1' })
    expect(background).toHaveStyle({ opacity: '1' })
  })

  it('keeps the color layer even by avoiding panel backdrop blur', () => {
    resetStores({
      liveOverrides: {
        blur: 12,
        bgColor: { r: 0, g: 0, b: 0, a: 0.4 },
        alwaysOnDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isDisplay: false,
      },
    })

    const { container } = render(<YTDLiveChatIframe mode='live' />)
    const background = container.querySelector('[data-ylc-chat-background]') as HTMLElement
    const carrier = container.querySelector('[data-ylc-iframe-carrier]') as HTMLElement

    expect(background.style.backgroundColor).toBe('rgba(0, 0, 0, 0.4)')
    expect(background.style.backdropFilter).toBe('')
    expect(carrier.style.filter).toBe('')
  })

  it('keeps chat-only mode free of panel backdrop blur', () => {
    resetStores({
      liveOverrides: {
        blur: 12,
        bgColor: { r: 0, g: 0, b: 0, a: 0.4 },
        alwaysOnDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isDisplay: false,
        isChatOnlyChromeHidden: true,
      },
    })

    const { container } = render(<YTDLiveChatIframe mode='live' />)
    const background = container.querySelector('[data-ylc-chat-background]') as HTMLElement

    expect(background.style.backgroundColor).toBe('rgba(0, 0, 0, 0.4)')
    expect(background.style.backdropFilter).toBe('')
  })

  it('keeps the iframe carrier fixed while chat-only chrome is hidden inside the iframe', () => {
    resetStores({
      noLsOverrides: {
        isChatOnlyChromeHidden: true,
      },
    })

    const { container } = render(<YTDLiveChatIframe mode='live' />)
    const carrier = container.querySelector('[data-ylc-iframe-carrier]') as HTMLElement

    expect(carrier).toHaveClass('inset-0')
    expect(carrier.style.top).toBe('')
    expect(carrier.style.height).toBe('')
  })

  it('keeps the loader on the visible panel instead of applying clip offsets', () => {
    resetStores({
      noLsOverrides: {
        isIframeLoaded: false,
        isChatOnlyChromeHidden: true,
      },
    })

    const { getByRole } = render(<YTDLiveChatIframe mode='live' />)
    const loader = getByRole('status', { hidden: true }).parentElement as HTMLElement

    expect(loader).toHaveClass('inset-0')
    expect(loader.style.top).toBe('')
    expect(loader.style.bottom).toBe('')
    expect(loader.style.backdropFilter).toBe('')
  })
})
