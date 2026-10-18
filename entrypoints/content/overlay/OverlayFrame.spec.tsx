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

const flushPointerFrame = () => act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))

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

  it('previews pointer movement and commits the displayed position only when released', async () => {
    const onInteractionStateChange = vi.fn()
    const { getByRole } = renderWithStore(
      <OverlayFrame onInteractionStateChange={onInteractionStateChange}>
        <div>chat</div>
      </OverlayFrame>,
      store,
    )
    const panel = getByRole('application')
    expect(panel).toHaveStyle({ left: '100px', top: '60px', width: '300px', height: '300px' })
    const handle = getByRole('button', { name: 'content.aria.dragToMove' })
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 100, clientY: 100 })
    expect(onInteractionStateChange).toHaveBeenLastCalledWith('dragging')
    act(() => window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 120, clientY: 110 })))
    await flushPointerFrame()
    expect(panel).toHaveStyle({ left: '120px', top: '70px', width: '300px', height: '300px' })
    expect(store.get(chatSettingsStateAtom).geometry).toEqual(initialGeometry)

    act(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 120, clientY: 110 })))
    expect(onInteractionStateChange).toHaveBeenLastCalledWith('idle')
    expect(getByRole('application')).toHaveStyle({ left: '120px', top: '70px', width: '300px', height: '300px' })
    expect(store.get(chatSettingsStateAtom).geometry).toEqual({
      reference: 'player',
      rect: { x: 0.15, y: 70 / 600, width: 0.375, height: 0.5 },
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

  it('moves controls into the free side strip without an input-intercepting hover bridge', () => {
    window.innerWidth = 320
    window.innerHeight = 240
    store.set(chatSettingsStateAtom, {
      profile: DEFAULT_CHAT_PROFILE,
      geometry: { reference: 'player', rect: { x: 10 / 320, y: 10 / 240, width: 0.65, height: 200 / 240 }, pinned: true },
      presets: [],
    })
    const view = renderWithStore(<OverlayFrame>Native chat</OverlayFrame>, store)
    const panel = view.getByRole('application')
    const rail = view.container.querySelector<HTMLElement>('[data-ylc-control-rail]')
    const bridge = view.container.querySelector<HTMLElement>('[data-ylc-control-hover-bridge]')
    if (!rail || !bridge) throw new Error('Expected outside controls and their connection')

    expect(rail.style.flexDirection).toBe('column')
    expect(Number.parseFloat(rail.style.left)).toBeGreaterThanOrEqual(Number.parseFloat(panel.style.width))
    expect(Number.parseFloat(bridge.style.left)).toBeGreaterThanOrEqual(Number.parseFloat(panel.style.width))
    expect(Number.parseFloat(bridge.style.width)).toBe(6)
  })

  it('keeps a full-viewport chat clear on hover while allowing Tab to reveal the controls', async () => {
    const user = userEvent.setup()
    window.innerWidth = 260
    window.innerHeight = 200
    store.set(chatSettingsStateAtom, {
      profile: DEFAULT_CHAT_PROFILE,
      geometry: { reference: 'player', rect: { x: 10 / 260, y: 10 / 200, width: 0.65, height: 0.9 }, pinned: true },
      presets: [],
    })
    const view = renderWithStore(<OverlayFrame>Native chat</OverlayFrame>, store)
    const rail = view.container.querySelector<HTMLElement>('[data-ylc-control-rail]')
    const chat = view.container.querySelector<HTMLElement>('[data-ylc-chat-inner]')
    if (!rail || !chat) throw new Error('Expected chat and keyboard controls')
    fireEvent.mouseEnter(chat, { clientX: 30, clientY: 30 })
    expect(rail).toHaveStyle({ opacity: '0', pointerEvents: 'none' })
    expect(view.container.querySelector('[data-ylc-control-hover-bridge]')).toBeNull()

    await user.tab()

    expect(view.getByRole('button', { name: 'content.aria.openSettings' })).toHaveFocus()
    expect(rail).toHaveStyle({ opacity: '1', pointerEvents: 'auto' })
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
