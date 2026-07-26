import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useOverlayInteraction } from './useOverlayInteraction'

const renderInteraction = (overrides: Partial<Parameters<typeof useOverlayInteraction>[0]> = {}) =>
  renderHook(() =>
    useOverlayInteraction({
      initialDisplayOnMount: false,
      settingsOpen: false,
      documentFocused: true,
      alwaysVisible: false,
      ...overrides,
    }),
  )

describe('useOverlayInteraction', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('derives chat and controls visibility from local hover state', () => {
    const { result } = renderInteraction()

    expect(result.current.state).toBe('idle')
    expect(result.current.chatVisible).toBe(false)
    expect(result.current.controlsVisible).toBe(false)

    act(() => result.current.enterChat())

    expect(result.current.state).toBe('hovering-chat')
    expect(result.current.chatVisible).toBe(true)
    expect(result.current.controlsVisible).toBe(true)
  })

  it('keeps the rail alive across the hover bridge and hides it after the configured grace period', () => {
    vi.useFakeTimers()
    const { result } = renderInteraction()

    act(() => result.current.enterChat())
    act(() => result.current.leaveChat())
    act(() => vi.advanceTimersByTime(100))
    act(() => result.current.enterControls())
    act(() => vi.advanceTimersByTime(100))

    expect(result.current.state).toBe('hovering-controls')
    expect(result.current.controlsVisible).toBe(true)

    act(() => result.current.leaveControls())
    act(() => vi.advanceTimersByTime(160))

    expect(result.current.state).toBe('idle')
    expect(result.current.controlsHiding).toBe(true)
  })

  it('gives settings and gestures explicit interaction states', () => {
    const { result, rerender } = renderInteraction()

    act(() => result.current.startDragging())
    expect(result.current.state).toBe('dragging')
    expect(result.current.chatVisible).toBe(true)

    act(() => result.current.finishDragging())
    act(() => result.current.startResizing())
    expect(result.current.state).toBe('resizing')

    rerender()
    act(() => result.current.finishResizing())
    expect(result.current.state).toBe('idle')
  })
})
