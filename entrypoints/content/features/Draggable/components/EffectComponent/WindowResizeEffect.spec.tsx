import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatStore } from '@/shared/stores'
import { WindowResizeEffect } from './WindowResizeEffect'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

const baseState = useYTDLiveChatStore.getState()

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

describe('WindowResizeEffect', () => {
  beforeEach(() => {
    resetStore()
  })

  it('shifts coordinates to keep the chat within the viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 500,
      writable: true,
      configurable: true,
    })

    resetStore({
      coordinates: { x: 200, y: 10 },
      size: { width: 400, height: 300 },
    })

    render(<WindowResizeEffect />)

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    const state = useYTDLiveChatStore.getState()
    expect(state.coordinates).toEqual({ x: 100, y: 10 })
    expect(state.size).toEqual({ width: 400, height: 300 })
  })

  it('reduces width when the chat extends beyond the viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 500,
      writable: true,
      configurable: true,
    })

    resetStore({
      coordinates: { x: 50, y: 20 },
      size: { width: 600, height: 320 },
    })

    render(<WindowResizeEffect />)

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    const state = useYTDLiveChatStore.getState()
    expect(state.coordinates).toEqual({ x: 50, y: 20 })
    expect(state.size).toEqual({ width: 450, height: 320 })
  })
})
