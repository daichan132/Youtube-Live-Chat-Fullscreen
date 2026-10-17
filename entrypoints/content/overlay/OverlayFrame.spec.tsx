import { act, fireEvent } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import type { ChatGeometryV2 } from '@/shared/settings/model'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { OverlayFrame } from './OverlayFrame'

vi.mock('@/entrypoints/content/hooks/watchYouTubeUI/useDocumentFocus', () => ({ useDocumentFocus: () => true }))

describe('OverlayFrame', () => {
  const store = createStore()
  const originalViewport = { width: window.innerWidth, height: window.innerHeight }
  const initialGeometry: ChatGeometryV2 = {
    reference: 'player',
    rect: { x: 0.125, y: 0.1, width: 0.375, height: 0.5 },
    pinned: true,
  }
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true, configurable: true })
    store.set(chatSettingsStateAtom, { profile: DEFAULT_CHAT_PROFILE, geometry: initialGeometry, presets: [] })
  })
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalViewport.width, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: originalViewport.height, writable: true, configurable: true })
  })

  it('connects pointer gesture state and commits through the geometry command', () => {
    const onInteractionStateChange = vi.fn()
    const { getByRole } = renderWithStore(
      <OverlayFrame onInteractionStateChange={onInteractionStateChange}>
        <div>chat</div>
      </OverlayFrame>,
      store,
    )
    const handle = getByRole('button', { name: 'content.aria.dragToMove' })
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 100, clientY: 100 })
    expect(onInteractionStateChange).toHaveBeenLastCalledWith('dragging')
    act(() => window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 120, clientY: 110 })))
    act(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 120, clientY: 110 })))
    expect(onInteractionStateChange).toHaveBeenLastCalledWith('idle')
    expect(getByRole('application')).toHaveStyle({ left: '120px', top: '70px', width: '300px', height: '300px' })
    expect(store.get(chatSettingsStateAtom).geometry).toEqual({
      reference: 'player',
      rect: { x: 0.15, y: 70 / 600, width: 0.375, height: 0.5 },
      pinned: true,
    })
  })

  it('cancels a pointer gesture without leaving the interaction state active', () => {
    const onInteractionStateChange = vi.fn()
    const { getByRole } = renderWithStore(
      <OverlayFrame onInteractionStateChange={onInteractionStateChange}>
        <div>chat</div>
      </OverlayFrame>,
      store,
    )
    const handle = getByRole('button', { name: 'content.aria.dragToMove' })
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 100, clientY: 100 })
    act(() => window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })))
    expect(onInteractionStateChange).toHaveBeenLastCalledWith('idle')
    expect(store.get(chatSettingsStateAtom).geometry).toEqual(initialGeometry)
  })

  it('moves the overlay from the focused drag handle with arrow keys', () => {
    const { getByRole } = renderWithStore(
      <OverlayFrame initialDisplayOnMount>
        <div>chat</div>
      </OverlayFrame>,
      store,
    )
    const handle = getByRole('button', { name: 'content.aria.dragToMove' })
    handle.focus()

    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    fireEvent.keyDown(handle, { key: 'ArrowDown' })

    expect(handle).toHaveFocus()
    expect(getByRole('application')).toHaveStyle({ left: '110px', top: '70px', width: '300px', height: '300px' })
    expect(store.get(chatSettingsStateAtom).geometry).toEqual({
      reference: 'player',
      rect: { x: 0.1375, y: 70 / 600, width: 0.375, height: 0.5 },
      pinned: true,
    })
  })
})
