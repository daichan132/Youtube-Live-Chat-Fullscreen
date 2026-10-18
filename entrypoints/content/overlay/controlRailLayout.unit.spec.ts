import { describe, expect, it } from 'vitest'
import { getControlRailLayout } from './controlRailLayout'

const intersects = (a: { left: number; top: number; width: number; height: number }, b: typeof a) =>
  a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top

describe('native-safe control rail placement', () => {
  it.each([
    { side: 'bottom', viewport: { width: 1280, height: 720 }, chat: { left: 100, top: 80, width: 400, height: 300 } },
    { side: 'top', viewport: { width: 1280, height: 720 }, chat: { left: 100, top: 530, width: 240, height: 180 } },
    { side: 'right', viewport: { width: 320, height: 240 }, chat: { left: 10, top: 10, width: 240, height: 200 } },
    { side: 'left', viewport: { width: 320, height: 240 }, chat: { left: 70, top: 10, width: 240, height: 200 } },
  ])('uses the $side free region while the rail and bridge leave native chat untouched', ({ side, viewport, chat }) => {
    const layout = getControlRailLayout({ chat, viewport, length: 130, thickness: 46 })
    const rail = { ...layout.rail, left: chat.left + layout.rail.left, top: chat.top + layout.rail.top }
    expect(layout.side).toBe(side)
    expect(layout.hoverEnabled).toBe(true)
    expect(intersects(rail, chat)).toBe(false)
    expect(rail.left).toBeGreaterThanOrEqual(4)
    expect(rail.top).toBeGreaterThanOrEqual(4)
    expect(rail.left + rail.width).toBeLessThanOrEqual(viewport.width - 4)
    expect(rail.top + rail.height).toBeLessThanOrEqual(viewport.height - 4)
    if (side === 'left' || side === 'right') {
      expect(rail.top).toBe(chat.top)
      expect(rail.top + rail.height).toBe(140)
    }
    expect(layout.bridge).not.toBeNull()
    if (!layout.bridge) throw new Error('Expected an outside hover connection')
    expect(intersects({ ...layout.bridge, left: chat.left + layout.bridge.left, top: chat.top + layout.bridge.top }, chat)).toBe(false)
  })

  it('fits measured larger controls instead of assuming the default icon dimensions', () => {
    const layout = getControlRailLayout({
      chat: { left: 10, top: 10, width: 240, height: 200 },
      viewport: { width: 320, height: 240 },
      length: 142,
      thickness: 50,
    })
    expect(layout.side).toBe('right')
    expect(layout.rail.width).toBe(50)
    expect(layout.rail.height).toBe(142)
    expect(layout.rail.top + 10).toBe(10)
    expect(layout.rail.top + 10 + layout.rail.height).toBe(152)
  })

  it('uses keyboard-only controls without a hover bridge when no outside region fits', () => {
    const layout = getControlRailLayout({
      chat: { left: 10, top: 10, width: 240, height: 180 },
      viewport: { width: 260, height: 200 },
      length: 130,
      thickness: 46,
    })
    expect(layout.side).toBe('keyboard')
    expect(layout.hoverEnabled).toBe(false)
    expect(layout.bridge).toBeNull()
  })
})
