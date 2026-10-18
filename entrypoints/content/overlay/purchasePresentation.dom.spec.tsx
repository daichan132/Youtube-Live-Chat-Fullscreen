import { act, cleanup, render } from '@testing-library/react'
import { Provider } from 'jotai'
import { createStore } from 'jotai/vanilla'
import { afterEach, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import { OverlayFrame } from './OverlayFrame'

vi.mock('@/entrypoints/content/hooks/watchYouTubeUI/useDocumentFocus', () => ({ useDocumentFocus: () => true }))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('keeps purchase UI visible and usable without saving temporary size or position', () => {
  vi.useFakeTimers()
  const store = createStore()
  const geometry = { reference: 'player' as const, rect: { x: 0.85, y: 0.8, width: 0.1, height: 0.1 }, pinned: true }
  store.set(chatSettingsStateAtom, { profile: DEFAULT_CHAT_PROFILE, geometry, presets: [] })
  const visibility = vi.fn()
  const tree = (active: boolean) => (
    <OverlayFrame purchaseActive={active} onChatVisibilityChange={visibility}>
      <div>Native purchase UI</div>
    </OverlayFrame>
  )
  const view = render(tree(true), { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> })
  const panel = view.getByRole('application')
  const left = Number.parseFloat(panel.style.left)
  const top = Number.parseFloat(panel.style.top)
  expect(Number.parseFloat(panel.style.width)).toBe(360)
  expect(Number.parseFloat(panel.style.height)).toBe(480)
  expect(left).toBeGreaterThanOrEqual(10)
  expect(top).toBeGreaterThanOrEqual(10)
  expect(left + 360).toBeLessThanOrEqual(window.innerWidth - 10)
  expect(top + 480).toBeLessThanOrEqual(window.innerHeight - 10)
  expect(panel.querySelector('[data-ylc-control-rail]')).toBeNull()
  expect(panel.querySelector('[data-ylc-resize-direction]')).toBeNull()
  expect(panel.querySelector('[data-ylc-control-hover-bridge]')).toBeNull()
  act(() => {
    vi.advanceTimersByTime(10000)
  })
  expect(visibility).toHaveBeenLastCalledWith(true)
  expect(store.get(chatSettingsStateAtom).geometry).toEqual(geometry)
  view.rerender(tree(false))
  expect(panel.querySelector('[data-ylc-drag-handle]')).not.toBeNull()
  expect(panel.querySelector('[data-ylc-resize-direction]')).not.toBeNull()
  expect(Number.parseFloat(panel.style.width)).toBeLessThan(360)
  expect(Number.parseFloat(panel.style.height)).toBeLessThan(480)
  expect(store.get(chatSettingsStateAtom).geometry).toEqual(geometry)
})

it('fits a purchase within a player smaller than the temporary minimum without changing the saved layout', () => {
  vi.stubGlobal('innerWidth', 340)
  vi.stubGlobal('innerHeight', 300)
  const store = createStore()
  const geometry = { reference: 'player' as const, rect: { x: 0.75, y: 0.75, width: 0.2, height: 0.2 }, pinned: true }
  store.set(chatSettingsStateAtom, { profile: DEFAULT_CHAT_PROFILE, geometry, presets: [] })
  const view = render(
    <Provider store={store}>
      <OverlayFrame purchaseActive>Native purchase UI</OverlayFrame>
    </Provider>,
  )
  const panel = view.getByRole('application')
  expect(panel.style.left).toBe('10px')
  expect(panel.style.top).toBe('10px')
  expect(panel.style.width).toBe('320px')
  expect(panel.style.height).toBe('280px')
  expect(store.get(chatSettingsStateAtom).geometry).toEqual(geometry)
})
