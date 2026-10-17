import { act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('applies every placement action to the visible panel and saves player-relative geometry', async () => {
    const user = userEvent.setup()
    const { getByRole } = renderWithStore(
      <OverlayFrame>
        <div>chat</div>
      </OverlayFrame>,
      store,
    )
    await user.tab()
    await user.tab()
    await user.tab()
    expect(getByRole('button', { name: 'content.placement.open' })).toHaveFocus()
    await user.keyboard('{Enter}')

    for (const [action, left, top, width, height] of [
      ['up', 100, 50, 300, 300],
      ['down', 100, 60, 300, 300],
      ['left', 90, 60, 300, 300],
      ['right', 100, 60, 300, 300],
      ['narrower', 100, 60, 290, 300],
      ['wider', 100, 60, 300, 300],
      ['shorter', 100, 60, 300, 290],
      ['taller', 100, 60, 300, 300],
    ] as const) {
      await user.click(getByRole('button', { name: `content.placement.${action}` }))

      expect(getByRole('application'), action).toHaveStyle({
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      })
      expect(store.get(chatSettingsStateAtom).geometry, action).toEqual({
        reference: 'player',
        rect: { x: left / 800, y: top / 600, width: width / 800, height: height / 600 },
        pinned: true,
      })
    }
  })
})
