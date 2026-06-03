import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IFRAME_CLIP_PATH_CLASS } from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { ClipPathEffect } from './ClipPathEffect'

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
      clip: { ...baseNoLsState.clip, ...(noLsOverrides.clip ?? {}) },
    },
    true,
  )
}

const createIframeWithClipElements = ({ headerHeight, inputHeight }: { headerHeight: number; inputHeight: number }) => {
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  const doc = document.implementation.createHTMLDocument('')

  const header = doc.createElement('yt-live-chat-header-renderer')
  Object.defineProperty(header, 'clientHeight', { value: headerHeight, configurable: true })

  const input = doc.createElement('yt-live-chat-message-input-renderer')
  Object.defineProperty(input, 'clientHeight', { value: inputHeight, configurable: true })

  doc.body.appendChild(header)
  doc.body.appendChild(input)

  Object.defineProperty(iframe, 'contentDocument', {
    value: doc,
    configurable: true,
  })

  return iframe
}

const setIframeClipHeights = (iframe: HTMLIFrameElement, { headerHeight, inputHeight }: { headerHeight: number; inputHeight: number }) => {
  const header = iframe.contentDocument?.querySelector('yt-live-chat-header-renderer')
  const input = iframe.contentDocument?.querySelector('yt-live-chat-message-input-renderer')
  if (!header || !input) return
  Object.defineProperty(header, 'clientHeight', { value: headerHeight, configurable: true })
  Object.defineProperty(input, 'clientHeight', { value: inputHeight, configurable: true })
}

describe('ClipPathEffect', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetStores()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('measures clip without changing panel geometry when clip path is first enabled', async () => {
    const iframe = createIframeWithClipElements({ headerHeight: 40, inputHeight: 24 })

    resetStores({
      liveOverrides: {
        coordinates: { x: 10, y: 20 },
        size: { width: 300, height: 200 },
        alwaysOnDisplay: true,
        chatOnlyDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isHover: false,
        isOpenSettingModal: false,
        isClipPath: undefined,
        iframeElement: iframe,
        clip: { header: 0, input: 0 },
      },
    })

    render(<ClipPathEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })

    await act(async () => {
      await Promise.resolve()
    })

    const liveState = useYTDLiveChatStore.getState()
    const noLsState = useYTDLiveChatNoLsStore.getState()

    expect(noLsState.isClipPath).toBe(true)
    expect(noLsState.clip).toEqual({ header: 36, input: 24 })
    expect(liveState.coordinates).toEqual({ x: 10, y: 20 })
    expect(liveState.size).toEqual({ width: 300, height: 200 })
  })

  it('keeps clip path disabled while the external controls are fading out', () => {
    const iframe = createIframeWithClipElements({ headerHeight: 40, inputHeight: 24 })

    resetStores({
      liveOverrides: {
        coordinates: { x: 10, y: 20 },
        size: { width: 300, height: 200 },
        alwaysOnDisplay: true,
        chatOnlyDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isHover: false,
        isOpenSettingModal: false,
        isClipPath: false,
        iframeElement: iframe,
      },
    })

    render(<ClipPathEffect isDragging={false} isResizing={false} isControlRailHiding />)

    act(() => {
      vi.advanceTimersByTime(20)
    })

    expect(useYTDLiveChatNoLsStore.getState().isClipPath).toBe(false)
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 10, y: 20 })
    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 300, height: 200 })
  })

  it('keeps measured clip and panel geometry stable while resizing', async () => {
    const iframe = createIframeWithClipElements({ headerHeight: 40, inputHeight: 24 })

    resetStores({
      liveOverrides: {
        coordinates: { x: 10, y: 20 },
        size: { width: 300, height: 200 },
        alwaysOnDisplay: true,
        chatOnlyDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isHover: false,
        isOpenSettingModal: false,
        isClipPath: undefined,
        iframeElement: iframe,
        clip: { header: 0, input: 0 },
      },
    })

    const { rerender } = render(<ClipPathEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(useYTDLiveChatNoLsStore.getState().isClipPath).toBe(true)
    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 300, height: 200 })
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 10, y: 20 })

    rerender(<ClipPathEffect isDragging={false} isResizing={true} />)
    setIframeClipHeights(iframe, { headerHeight: 52, inputHeight: 30 })

    act(() => {
      vi.advanceTimersByTime(160)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(useYTDLiveChatNoLsStore.getState().isClipPath).toBe(true)
    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 300, height: 200 })
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 10, y: 20 })
  })

  it('removes focus from the iframe when clip path is enabled', async () => {
    const iframe = createIframeWithClipElements({ headerHeight: 40, inputHeight: 24 })
    const activeElement = iframe.contentDocument?.createElement('button') as HTMLButtonElement
    const blur = vi.spyOn(activeElement, 'blur')
    Object.defineProperty(iframe.contentDocument, 'activeElement', {
      value: activeElement,
      configurable: true,
    })

    resetStores({
      liveOverrides: {
        coordinates: { x: 10, y: 20 },
        size: { width: 300, height: 200 },
        alwaysOnDisplay: true,
        chatOnlyDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isHover: false,
        isOpenSettingModal: false,
        isClipPath: undefined,
        iframeElement: iframe,
        clip: { header: 0, input: 0 },
      },
    })

    render(<ClipPathEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(blur).toHaveBeenCalledTimes(1)
  })

  it('auto-hides chrome after load even when hover is initially true', async () => {
    const iframe = createIframeWithClipElements({ headerHeight: 40, inputHeight: 24 })

    resetStores({
      liveOverrides: {
        coordinates: { x: 10, y: 20 },
        size: { width: 300, height: 200 },
        alwaysOnDisplay: true,
        chatOnlyDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isHover: true,
        isOpenSettingModal: false,
        isClipPath: undefined,
        iframeElement: iframe,
        clip: { header: 0, input: 0 },
      },
    })

    render(<ClipPathEffect isDragging={false} isResizing={false} />)

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

    const liveState = useYTDLiveChatStore.getState()
    const noLsState = useYTDLiveChatNoLsStore.getState()
    expect(noLsState.isHover).toBe(false)
    expect(noLsState.isClipPath).toBe(true)
    expect(liveState.coordinates).toEqual({ x: 10, y: 20 })
    expect(liveState.size).toEqual({ width: 300, height: 200 })
  })

  it('toggles clip path with hover without changing panel geometry', async () => {
    const iframe = createIframeWithClipElements({ headerHeight: 40, inputHeight: 24 })

    resetStores({
      liveOverrides: {
        coordinates: { x: 10, y: 20 },
        size: { width: 300, height: 200 },
        alwaysOnDisplay: true,
        chatOnlyDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isHover: false,
        isOpenSettingModal: false,
        isClipPath: undefined,
        iframeElement: iframe,
        clip: { header: 0, input: 0 },
      },
    })

    render(<ClipPathEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 300, height: 200 })
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 10, y: 20 })

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

    // Hover disables clip and keeps the visible panel geometry stable.
    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 300, height: 200 })
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 10, y: 20 })

    act(() => {
      useYTDLiveChatNoLsStore.getState().setIsHover(false)
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

    // Unhover enables clip again while leaving geometry untouched.
    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 300, height: 200 })
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 10, y: 20 })
  })

  it('keeps panel geometry when iframe unload disables clip path', async () => {
    const iframe = createIframeWithClipElements({ headerHeight: 40, inputHeight: 24 })

    resetStores({
      liveOverrides: {
        coordinates: { x: 10, y: 20 },
        size: { width: 300, height: 200 },
        alwaysOnDisplay: true,
        chatOnlyDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isHover: false,
        isOpenSettingModal: false,
        isClipPath: undefined,
        iframeElement: iframe,
        clip: { header: 0, input: 0 },
      },
    })

    render(<ClipPathEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 300, height: 200 })
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 10, y: 20 })

    act(() => {
      useYTDLiveChatNoLsStore.getState().setIsIframeLoaded(false)
    })
    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(useYTDLiveChatNoLsStore.getState().isClipPath).toBe(false)
    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 300, height: 200 })
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 10, y: 20 })
  })

  it('toggles the iframe clip-path class with clip state', async () => {
    const iframe = createIframeWithClipElements({ headerHeight: 40, inputHeight: 24 })

    resetStores({
      liveOverrides: {
        coordinates: { x: 10, y: 20 },
        size: { width: 300, height: 200 },
        alwaysOnDisplay: true,
        chatOnlyDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isHover: false,
        isOpenSettingModal: false,
        isClipPath: undefined,
        iframeElement: iframe,
        clip: { header: 0, input: 0 },
      },
    })

    render(<ClipPathEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CLIP_PATH_CLASS)).toBe(true)

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

    expect(iframe.contentDocument?.body.classList.contains(IFRAME_CLIP_PATH_CLASS)).toBe(false)
  })

  it('keeps panel geometry stable when clip is re-applied with the same values', async () => {
    const iframe = createIframeWithClipElements({ headerHeight: 40, inputHeight: 24 })

    resetStores({
      liveOverrides: {
        coordinates: { x: 10, y: 20 },
        size: { width: 300, height: 200 },
        alwaysOnDisplay: true,
        chatOnlyDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isHover: false,
        isOpenSettingModal: false,
        isClipPath: undefined,
        iframeElement: iframe,
        clip: { header: 0, input: 0 },
      },
    })

    render(<ClipPathEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    const firstClippedLayout = useYTDLiveChatStore.getState()
    expect(firstClippedLayout.size).toEqual({ width: 300, height: 200 })
    expect(firstClippedLayout.coordinates).toEqual({ x: 10, y: 20 })

    // Re-run clip application via iframe replacement with the same measurable clip values.
    const replacementIframe = createIframeWithClipElements({ headerHeight: 40, inputHeight: 24 })
    act(() => {
      useYTDLiveChatNoLsStore.getState().setIFrameElement(replacementIframe)
    })
    await act(async () => {
      await Promise.resolve()
    })

    const secondClippedLayout = useYTDLiveChatStore.getState()
    expect(secondClippedLayout.size).toEqual({ width: 300, height: 200 })
    expect(secondClippedLayout.coordinates).toEqual({ x: 10, y: 20 })
  })

  it('keeps first hover geometry stable after clip measurement changes', async () => {
    const iframe = createIframeWithClipElements({ headerHeight: 40, inputHeight: 24 })

    resetStores({
      liveOverrides: {
        coordinates: { x: 10, y: 20 },
        size: { width: 300, height: 200 },
        alwaysOnDisplay: true,
        chatOnlyDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isHover: false,
        isOpenSettingModal: false,
        isClipPath: undefined,
        iframeElement: iframe,
        clip: { header: 0, input: 0 },
      },
    })

    render(<ClipPathEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    // Simulate runtime DOM changes after clip was enabled (e.g. font/layout settling).
    setIframeClipHeights(iframe, { headerHeight: 52, inputHeight: 30 })

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

    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 300, height: 200 })
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 10, y: 20 })
  })

  it('updates clip measurement when clip elements become measurable after initial zero clip', async () => {
    const iframe = createIframeWithClipElements({ headerHeight: 4, inputHeight: 0 })

    resetStores({
      liveOverrides: {
        coordinates: { x: 10, y: 20 },
        size: { width: 300, height: 200 },
        alwaysOnDisplay: true,
        chatOnlyDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isHover: false,
        isOpenSettingModal: false,
        isClipPath: undefined,
        iframeElement: iframe,
        clip: { header: 0, input: 0 },
      },
    })

    render(<ClipPathEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(40)
    })
    await act(async () => {
      await Promise.resolve()
    })

    // Initial clip measurement is zero, so geometry is unchanged.
    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 300, height: 200 })
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 10, y: 20 })

    // Header/input become measurable later without hover toggling.
    setIframeClipHeights(iframe, { headerHeight: 40, inputHeight: 24 })

    act(() => {
      vi.advanceTimersByTime(140)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(useYTDLiveChatNoLsStore.getState().clip).toEqual({ header: 36, input: 24 })
    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 300, height: 200 })
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 10, y: 20 })
  })

  it('measures first clip once iframe body becomes available', async () => {
    resetStores({
      liveOverrides: {
        coordinates: { x: 10, y: 20 },
        size: { width: 300, height: 200 },
        alwaysOnDisplay: true,
        chatOnlyDisplay: true,
      },
      noLsOverrides: {
        isIframeLoaded: true,
        isHover: false,
        isOpenSettingModal: false,
        isClipPath: undefined,
        iframeElement: null,
        clip: { header: 0, input: 0 },
      },
    })

    render(<ClipPathEffect isDragging={false} isResizing={false} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })
    await act(async () => {
      await Promise.resolve()
    })

    // No iframe body yet, so geometry has not changed.
    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 300, height: 200 })
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 10, y: 20 })

    const iframe = createIframeWithClipElements({ headerHeight: 40, inputHeight: 24 })
    act(() => {
      useYTDLiveChatNoLsStore.getState().setIFrameElement(iframe)
    })
    await act(async () => {
      await Promise.resolve()
    })

    // Once body is available, clip is measured without changing geometry.
    expect(useYTDLiveChatNoLsStore.getState().clip).toEqual({ header: 36, input: 24 })
    expect(useYTDLiveChatStore.getState().size).toEqual({ width: 300, height: 200 })
    expect(useYTDLiveChatStore.getState().coordinates).toEqual({ x: 10, y: 20 })
  })
})
