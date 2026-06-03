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
      clip: { ...baseNoLsState.clip, ...(noLsOverrides.clip ?? {}) },
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
    expect(carrier).toHaveStyle({
      top: '0px',
      height: '100%',
    })
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

  it('shifts and expands the iframe carrier while chat-only crop is enabled', () => {
    resetStores({
      noLsOverrides: {
        isClipPath: true,
        clip: { header: 28, input: 24 },
      },
    })

    const { container } = render(<YTDLiveChatIframe mode='live' />)
    const carrier = container.querySelector('[data-ylc-iframe-carrier]') as HTMLElement

    expect(carrier).toHaveStyle({
      top: '-28px',
      height: 'calc(100% + 52px)',
    })
  })

  it('keeps the loader on the visible panel instead of applying clip offsets', () => {
    resetStores({
      noLsOverrides: {
        isIframeLoaded: false,
        isClipPath: true,
        clip: { header: 28, input: 24 },
      },
    })

    const { getByRole } = render(<YTDLiveChatIframe mode='live' />)
    const loader = getByRole('status', { hidden: true }).parentElement as HTMLElement

    expect(loader).toHaveClass('inset-0')
    expect(loader.style.top).toBe('')
    expect(loader.style.bottom).toBe('')
  })
})
