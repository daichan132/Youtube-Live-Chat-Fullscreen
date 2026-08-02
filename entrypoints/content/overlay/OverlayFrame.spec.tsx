import { act, fireEvent } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderChatGeometry } from '@/shared/settings/chatGeometry'
import { DEFAULT_CHAT_GEOMETRY, DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { OverlayFrame } from './OverlayFrame'

vi.mock('@/entrypoints/content/hooks/watchYouTubeUI/useDocumentFocus', () => ({ useDocumentFocus: () => true }))

describe('OverlayFrame', () => {
  const store = createStore()
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true, configurable: true })
    store.set(chatSettingsStateAtom, { profile: DEFAULT_CHAT_PROFILE, geometry: DEFAULT_CHAT_GEOMETRY, presets: [] })
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
    const coordinates = renderChatGeometry(store.get(chatSettingsStateAtom).geometry, { width: 800, height: 600 }).coordinates
    expect(coordinates.x).toBeCloseTo(renderChatGeometry(DEFAULT_CHAT_GEOMETRY, { width: 800, height: 600 }).coordinates.x + 20)
    expect(coordinates.y).toBeCloseTo(renderChatGeometry(DEFAULT_CHAT_GEOMETRY, { width: 800, height: 600 }).coordinates.y + 10)
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
    expect(store.get(chatSettingsStateAtom).geometry).toEqual(DEFAULT_CHAT_GEOMETRY)
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
    const coordinates = renderChatGeometry(store.get(chatSettingsStateAtom).geometry, { width: 800, height: 600 }).coordinates
    expect(coordinates.x).toBeCloseTo(renderChatGeometry(DEFAULT_CHAT_GEOMETRY, { width: 800, height: 600 }).coordinates.x + 10)
    expect(coordinates.y).toBeCloseTo(renderChatGeometry(DEFAULT_CHAT_GEOMETRY, { width: 800, height: 600 }).coordinates.y + 10)
  })
})
