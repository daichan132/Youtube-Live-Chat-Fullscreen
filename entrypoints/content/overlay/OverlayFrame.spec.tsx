import { act, fireEvent } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import type { ChatGeometryV2 } from '@/shared/settings/model'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { OverlayFrame } from './OverlayFrame'

vi.mock('@/entrypoints/content/hooks/watchYouTubeUI/useDocumentFocus', () => ({ useDocumentFocus: () => true }))

// 100 × 60 position and 400 × 240 size in an 800 × 600 player.
const initialGeometry: ChatGeometryV2 = {
  reference: 'player',
  rect: { x: 0.125, y: 0.1, width: 0.5, height: 0.4 },
  pinned: true,
}
const flushPointerFrame = () => act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))

describe('OverlayFrame', () => {
  const store = createStore()
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true, configurable: true })
    store.set(chatSettingsStateAtom, { profile: DEFAULT_CHAT_PROFILE, geometry: initialGeometry, presets: [] })
  })

  it('previews pointer movement and commits the displayed position only when released', async () => {
    const onInteractionStateChange = vi.fn()
    const { getByRole } = renderWithStore(
      <OverlayFrame onInteractionStateChange={onInteractionStateChange}>
        <div>chat</div>
      </OverlayFrame>,
      store,
    )
    const panel = getByRole('application')
    expect(panel).toHaveStyle({ left: '100px', top: '60px', width: '400px', height: '240px' })
    const handle = getByRole('button', { name: 'content.aria.dragToMove' })
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 100, clientY: 100 })
    expect(onInteractionStateChange).toHaveBeenLastCalledWith('dragging')
    act(() => window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 120, clientY: 110 })))
    await flushPointerFrame()
    expect(panel).toHaveStyle({ left: '120px', top: '70px', width: '400px', height: '240px' })
    expect(store.get(chatSettingsStateAtom).geometry).toEqual(initialGeometry)

    act(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 120, clientY: 110 })))
    expect(onInteractionStateChange).toHaveBeenLastCalledWith('idle')
    expect(panel).toHaveStyle({ left: '120px', top: '70px' })
    expect(store.get(chatSettingsStateAtom).geometry).toMatchObject({
      reference: 'player',
      rect: { x: 0.15, y: expect.closeTo(0.116667), width: 0.5, height: 0.4 },
      pinned: true,
    })
  })

  it('discards the visible draft on pointer cancellation without saving it', async () => {
    const onInteractionStateChange = vi.fn()
    const { getByRole } = renderWithStore(
      <OverlayFrame onInteractionStateChange={onInteractionStateChange}>
        <div>chat</div>
      </OverlayFrame>,
      store,
    )
    const panel = getByRole('application')
    const handle = getByRole('button', { name: 'content.aria.dragToMove' })
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 100, clientY: 100 })
    act(() => window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 140, clientY: 120 })))
    await flushPointerFrame()
    expect(panel).toHaveStyle({ left: '140px', top: '80px' })

    act(() => window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })))
    expect(onInteractionStateChange).toHaveBeenLastCalledWith('idle')
    expect(panel).toHaveStyle({ left: '100px', top: '60px', width: '400px', height: '240px' })
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
    expect(getByRole('application')).toHaveStyle({ left: '110px', top: '70px', width: '400px', height: '240px' })
    expect(store.get(chatSettingsStateAtom).geometry).toMatchObject({
      reference: 'player',
      rect: { x: 0.1375, y: expect.closeTo(0.116667), width: 0.5, height: 0.4 },
      pinned: true,
    })
  })
})
