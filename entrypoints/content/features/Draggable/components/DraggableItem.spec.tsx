import { act, fireEvent, render } from '@testing-library/react'
import type { CSSProperties, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { DraggableItem } from './DraggableItem'

type MockResizableProps = {
  children: ReactNode
  style?: CSSProperties
  handleStyles?: Record<string, CSSProperties | undefined>
  handleWrapperStyle?: CSSProperties
  onResizeStart?: () => void
  onResize?: (
    event: MouseEvent | TouchEvent,
    direction: 'topLeft' | 'bottomRight',
    ref: HTMLElement,
    delta: { width: number; height: number },
  ) => void
  onResizeStop?: (
    event: MouseEvent | TouchEvent,
    direction: 'topLeft' | 'bottomRight',
    ref: HTMLElement,
    delta: { width: number; height: number },
  ) => void
}

const resizableState = vi.hoisted(() => ({
  props: null as MockResizableProps | null,
}))

const draggableState = vi.hoisted(() => ({
  isDragging: false,
  transform: null as { x: number; y: number } | null,
  setNodeRef: vi.fn(),
}))

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    isDragging: draggableState.isDragging,
    listeners: {},
    setNodeRef: draggableState.setNodeRef,
    transform: draggableState.transform,
  }),
}))

vi.mock('re-resizable', () => ({
  Resizable: (props: MockResizableProps) => {
    resizableState.props = props
    return <div data-ylc-resizable>{props.children}</div>
  },
}))

vi.mock('./ControlIcons', () => ({
  ControlIcons: ({
    controlRailStyle,
    isVisible,
    onControlsHoverChange,
    onSettingsClick,
  }: {
    controlRailStyle: CSSProperties
    isVisible: boolean
    onControlsHoverChange: (isHover: boolean) => void
    onSettingsClick: () => void
  }) => (
    <button
      type='button'
      data-ylc-control-rail
      data-testid='ylc-control-rail'
      data-visible={String(isVisible)}
      style={controlRailStyle}
      onMouseEnter={() => onControlsHoverChange(true)}
      onMouseLeave={() => onControlsHoverChange(false)}
      onClick={onSettingsClick}
    />
  ),
}))

vi.mock('./EffectComponent/ChatOnlyChromeEffect', () => ({
  ChatOnlyChromeEffect: () => null,
}))

const baseState = useYTDLiveChatStore.getState()
const baseNoLsState = useYTDLiveChatNoLsStore.getState()

const resetStore = (overrides: Partial<typeof baseState> = {}) => {
  useYTDLiveChatStore.setState(
    {
      ...baseState,
      ...overrides,
      coordinates: { ...baseState.coordinates, ...(overrides.coordinates ?? {}) },
      size: { ...baseState.size, ...(overrides.size ?? {}) },
      presetItemIds: [...baseState.presetItemIds],
      presetItemStyles: { ...baseState.presetItemStyles },
      presetItemTitles: { ...baseState.presetItemTitles },
    },
    true,
  )
}

const resetNoLsStore = (overrides: Partial<typeof baseNoLsState> = {}) => {
  useYTDLiveChatNoLsStore.setState(
    {
      ...baseNoLsState,
      ...overrides,
    },
    true,
  )
}

const setHasFocus = (value: boolean) => {
  Object.defineProperty(document, 'hasFocus', {
    value: () => value,
    configurable: true,
  })
}

const setElementRect = (element: HTMLElement, rect: Pick<DOMRect, 'top' | 'right' | 'bottom' | 'left' | 'width' | 'height'>) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({
      x: rect.left,
      y: rect.top,
      ...rect,
      toJSON: () => ({}),
    }),
    configurable: true,
  })
}

describe('DraggableItem', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.cursor = ''
    draggableState.isDragging = false
    draggableState.transform = null
    draggableState.setNodeRef.mockClear()
    resizableState.props = null
    resetStore()
    resetNoLsStore()
    setHasFocus(true)
    Object.defineProperty(window, 'innerWidth', {
      value: 500,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'innerHeight', {
      value: 500,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the chat within the viewport width when the window resizes', () => {
    resetStore({
      coordinates: { x: 200, y: 10 },
      size: { width: 400, height: 300 },
    })

    render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    const state = useYTDLiveChatStore.getState()
    expect(state.coordinates).toEqual({ x: 100, y: 10 })
    expect(state.size).toEqual({ width: 400, height: 300 })
  })

  it('positions the control rail below the chat bottom', () => {
    resetStore({
      coordinates: { x: 100, y: 50 },
      size: { width: 300, height: 200 },
    })

    const { getByTestId } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    expect(getByTestId('ylc-control-rail')).toHaveStyle({ top: '206px', right: '0px' })
  })

  it('positions the control rail below the visible chat panel in chat-only mode', () => {
    resetStore({
      coordinates: { x: 100, y: 10 },
      size: { width: 300, height: 200 },
    })
    const { getByTestId } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    expect(getByTestId('ylc-control-rail')).toHaveStyle({ top: '206px' })
  })

  it('keeps resize handles on the interactive visible panel in chat-only mode', () => {
    render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    expect(resizableState.props?.style?.pointerEvents).toBe('auto')
    expect(resizableState.props?.handleWrapperStyle?.pointerEvents).toBe('none')
    expect(resizableState.props?.handleStyles?.right?.pointerEvents).toBe('auto')
    expect(resizableState.props?.handleStyles?.bottomRight?.pointerEvents).toBe('auto')
  })

  it('keeps the control rail inside the viewport bottom without shifting horizontally', () => {
    resetStore({
      coordinates: { x: 0, y: 0 },
      size: { width: 300, height: 500 },
    })

    const { getByTestId } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    expect(getByTestId('ylc-control-rail')).toHaveStyle({ top: '450px', right: '0px' })
  })

  it('applies drag transform to the frame that contains chat and controls', () => {
    draggableState.transform = { x: 12, y: 8 }

    const { container } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    expect(container.querySelector('[data-ylc-draggable-frame]')).toHaveStyle({
      transform: 'translate3d(12px, 8px, 0)',
    })
  })

  it('measures the frame that receives the drag transform', () => {
    const { container } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    expect(draggableState.setNodeRef).toHaveBeenCalledWith(container.querySelector('[data-ylc-draggable-frame]'))
    expect(draggableState.setNodeRef).not.toHaveBeenCalledWith(container.querySelector('[data-ylc-chat-inner]'))
  })

  it('updates layout while resizing from the top-left corner', () => {
    resetStore({
      coordinates: { x: 100, y: 80 },
      size: { width: 300, height: 200 },
    })
    const resizeRef = document.createElement('div')

    render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    act(() => {
      resizableState.props?.onResizeStart?.()
      resizableState.props?.onResize?.(new MouseEvent('mousemove'), 'topLeft', resizeRef, { width: 40, height: 20 })
    })

    const state = useYTDLiveChatStore.getState()
    expect(state.coordinates).toEqual({ x: 60, y: 60 })
    expect(state.size).toEqual({ width: 340, height: 220 })
  })

  it('uses the resize-start size when cumulative resize deltas update repeatedly', () => {
    resetStore({
      coordinates: { x: 100, y: 80 },
      size: { width: 300, height: 200 },
    })
    const resizeRef = document.createElement('div')

    render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    act(() => {
      resizableState.props?.onResizeStart?.()
      resizableState.props?.onResize?.(new MouseEvent('mousemove'), 'bottomRight', resizeRef, { width: 40, height: 20 })
      resizableState.props?.onResize?.(new MouseEvent('mousemove'), 'bottomRight', resizeRef, { width: 45, height: 25 })
    })

    const state = useYTDLiveChatStore.getState()
    expect(state.coordinates).toEqual({ x: 100, y: 80 })
    expect(state.size).toEqual({ width: 345, height: 225 })
  })

  it('clamps size to the minimum values when resize stops', () => {
    resetStore({
      coordinates: { x: 100, y: 80 },
      size: { width: 300, height: 200 },
    })
    const resizeRef = document.createElement('div')
    Object.defineProperty(resizeRef, 'offsetWidth', { value: 10, configurable: true })
    Object.defineProperty(resizeRef, 'offsetHeight', { value: 20, configurable: true })

    render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    act(() => {
      resizableState.props?.onResizeStart?.()
      resizableState.props?.onResizeStop?.(new MouseEvent('mouseup'), 'bottomRight', resizeRef, { width: 0, height: 0 })
    })

    expect(useYTDLiveChatStore.getState().size).toEqual({ width: ResizableMinWidth, height: ResizableMinHeight })
  })

  it('disables YouTube pointer events while dragging and restores them on cleanup', () => {
    const ytdApp = document.createElement('ytd-app')
    document.body.style.cursor = 'wait'
    ytdApp.style.cursor = 'progress'
    document.body.appendChild(ytdApp)
    draggableState.isDragging = true

    const { rerender, unmount } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )
    expect(ytdApp.style.pointerEvents).toBe('none')
    expect(document.body.style.cursor).toBe('grabbing')
    expect(ytdApp.style.cursor).toBe('grabbing')

    draggableState.isDragging = false
    rerender(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )
    expect(ytdApp.style.pointerEvents).toBe('auto')
    expect(document.body.style.cursor).toBe('wait')
    expect(ytdApp.style.cursor).toBe('progress')

    ytdApp.style.pointerEvents = 'none'
    document.body.style.cursor = 'wait'
    ytdApp.style.cursor = 'progress'
    unmount()
    expect(ytdApp.style.pointerEvents).toBe('auto')
    expect(document.body.style.cursor).toBe('wait')
    expect(ytdApp.style.cursor).toBe('progress')
  })

  it('hides the chat when idle, not hovering, focused, and settings are closed', () => {
    vi.useFakeTimers()

    render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(false)
  })

  it('does not treat mount as display activity', () => {
    resetNoLsStore({ isHover: false, isDisplay: true })

    render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(false)
  })

  it('treats fullscreen mount as temporary display activity', () => {
    vi.useFakeTimers()
    resetNoLsStore({ isHover: false, isDisplay: false })

    render(
      <DraggableItem initialDisplayOnMount>
        <div />
      </DraggableItem>,
    )

    expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(false)
  })

  it('keeps the chat visible when hovering even if idle', () => {
    vi.useFakeTimers()
    resetNoLsStore({ isHover: true, isDisplay: false })

    render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(true)
  })

  it('keeps the chat visible when settings are open even if idle', () => {
    vi.useFakeTimers()
    resetNoLsStore({ isOpenSettingModal: true, isDisplay: false })

    render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(true)
  })

  it('hides the control rail while the settings panel is open', () => {
    resetNoLsStore({ isOpenSettingModal: true, isHover: true, isDisplay: true })

    const { getByTestId } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    expect(getByTestId('ylc-control-rail')).toHaveAttribute('data-visible', 'false')
  })

  it('keeps the chat visible while hovering controls without entering chat hover', () => {
    vi.useFakeTimers()
    resetNoLsStore({ isHover: false, isDisplay: false })

    const { getByTestId } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    act(() => {
      fireEvent.mouseEnter(getByTestId('ylc-control-rail'))
      vi.advanceTimersByTime(1000)
    })

    expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(true)
    expect(useYTDLiveChatNoLsStore.getState().isHover).toBe(false)
  })

  it('does not show controls just because document activity keeps chat visible', () => {
    vi.useFakeTimers()

    const { getByTestId } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove'))
    })

    expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(true)
    expect(getByTestId('ylc-control-rail')).toHaveAttribute('data-visible', 'false')
  })

  it('shows controls while hovering chat and hides them after leaving', () => {
    vi.useFakeTimers()

    const { container, getByTestId } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )
    const chatInner = container.querySelector('[data-ylc-chat-inner]') as HTMLElement
    setElementRect(chatInner, { top: 0, right: 300, bottom: 200, left: 0, width: 300, height: 200 })

    act(() => {
      fireEvent.mouseEnter(chatInner, { clientX: 20, clientY: 20 })
    })
    expect(getByTestId('ylc-control-rail')).toHaveAttribute('data-visible', 'true')

    act(() => {
      fireEvent.mouseLeave(chatInner)
      vi.advanceTimersByTime(159)
    })
    expect(useYTDLiveChatNoLsStore.getState().isHover).toBe(true)
    expect(getByTestId('ylc-control-rail')).toHaveAttribute('data-visible', 'true')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(useYTDLiveChatNoLsStore.getState().isHover).toBe(false)
    expect(getByTestId('ylc-control-rail')).toHaveAttribute('data-visible', 'false')
  })

  it('keeps display visible but clears chat hover while crossing from chat to controls', () => {
    vi.useFakeTimers()

    const { container, getByTestId } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )
    const chatInner = container.querySelector('[data-ylc-chat-inner]') as HTMLElement
    const controlRail = getByTestId('ylc-control-rail')
    setElementRect(chatInner, { top: 0, right: 300, bottom: 200, left: 0, width: 300, height: 200 })

    act(() => {
      fireEvent.mouseEnter(chatInner, { clientX: 20, clientY: 20 })
      fireEvent.mouseLeave(chatInner)
      vi.advanceTimersByTime(80)
    })

    expect(useYTDLiveChatNoLsStore.getState().isHover).toBe(true)
    expect(controlRail).toHaveAttribute('data-visible', 'true')

    act(() => {
      fireEvent.mouseEnter(controlRail)
      vi.advanceTimersByTime(160)
    })

    expect(useYTDLiveChatNoLsStore.getState().isHover).toBe(false)
    expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(true)
    expect(controlRail).toHaveAttribute('data-visible', 'true')

    act(() => {
      fireEvent.mouseLeave(controlRail)
      vi.advanceTimersByTime(160)
    })

    expect(useYTDLiveChatNoLsStore.getState().isHover).toBe(false)
    expect(controlRail).toHaveAttribute('data-visible', 'false')
  })

  it('extends the control hover area below the visible chat bottom', () => {
    resetStore({
      coordinates: { x: 100, y: 50 },
      size: { width: 300, height: 200 },
    })

    const { container } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )
    const bridge = container.querySelector('[data-ylc-control-hover-bridge]') as HTMLElement

    expect(bridge).toHaveStyle({ top: '188px', left: '0px', right: '0px', height: '76px' })
  })

  it('keeps display visible but clears chat hover while crossing through the hover bridge', () => {
    vi.useFakeTimers()
    resetNoLsStore({ isHover: true, isDisplay: true })

    const { container, getByTestId } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )
    const bridge = container.querySelector('[data-ylc-control-hover-bridge]') as HTMLElement

    act(() => {
      fireEvent.mouseLeave(container.querySelector('[data-ylc-chat-inner]') as HTMLElement)
      vi.advanceTimersByTime(120)
      fireEvent.mouseEnter(bridge)
      vi.advanceTimersByTime(160)
    })

    expect(useYTDLiveChatNoLsStore.getState().isHover).toBe(false)
    expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(true)
    expect(getByTestId('ylc-control-rail')).toHaveAttribute('data-visible', 'true')
  })

  it('shows controls from the extended hover area without entering chat hover', () => {
    vi.useFakeTimers()
    resetNoLsStore({ isHover: false, isDisplay: false })

    const { container, getByTestId } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )
    const bridge = container.querySelector('[data-ylc-control-hover-bridge]') as HTMLElement

    act(() => {
      fireEvent.mouseEnter(bridge)
      vi.advanceTimersByTime(1000)
    })

    expect(useYTDLiveChatNoLsStore.getState().isHover).toBe(false)
    expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(true)
    expect(getByTestId('ylc-control-rail')).toHaveAttribute('data-visible', 'true')
  })

  it('treats the visible panel as the chat-only hover area', () => {
    vi.useFakeTimers()
    resetNoLsStore({ isHover: false })

    const { container, getByTestId } = render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )
    const chatInner = container.querySelector('[data-ylc-chat-inner]') as HTMLElement
    setElementRect(chatInner, { top: 0, right: 300, bottom: 400, left: 0, width: 300, height: 400 })

    act(() => {
      fireEvent.mouseEnter(chatInner, { clientX: 20, clientY: 40 })
    })

    expect(useYTDLiveChatNoLsStore.getState().isHover).toBe(true)
    expect(getByTestId('ylc-control-rail')).toHaveAttribute('data-visible', 'true')

    act(() => {
      fireEvent.mouseMove(chatInner, { clientX: 20, clientY: 420 })
      vi.advanceTimersByTime(160)
    })

    expect(useYTDLiveChatNoLsStore.getState().isHover).toBe(false)
    expect(getByTestId('ylc-control-rail')).toHaveAttribute('data-visible', 'false')
  })

  it('keeps the chat visible when the document is unfocused', () => {
    vi.useFakeTimers()
    setHasFocus(false)
    resetNoLsStore({ isDisplay: false })

    render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(true)
  })

  it('resets the idle timer after document activity', () => {
    vi.useFakeTimers()

    render(
      <DraggableItem>
        <div />
      </DraggableItem>,
    )

    act(() => {
      vi.advanceTimersByTime(900)
      document.dispatchEvent(new MouseEvent('mousemove'))
      vi.advanceTimersByTime(900)
    })

    expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(true)

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(false)
  })
})
