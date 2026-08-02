import { describe, expect, it } from 'vitest'
import { chooseAutoSafePlacement, shouldApplyAutoSafePlacement } from './autoSafeArea'

const current = { coordinates: { x: 870, y: 10 }, size: { width: 400, height: 300 } }

describe('Auto Safe Area', () => {
  it('prioritizes overlap, then movement, then visible area', () => {
    const placement = chooseAutoSafePlacement(current, { width: 1280, height: 720 }, [
      { kind: 'menu', rect: { x: 850, y: 0, width: 430, height: 360 } },
    ])

    expect(placement.best.geometry.coordinates).toEqual({ x: 870, y: 410 })
    expect(shouldApplyAutoSafePlacement(placement)).toBe(true)
  })

  it('does not move for a small overlap improvement', () => {
    const placement = chooseAutoSafePlacement(current, { width: 1280, height: 720 }, [
      { kind: 'caption', rect: { x: 900, y: 280, width: 40, height: 40 } },
    ])

    expect(shouldApplyAutoSafePlacement(placement)).toBe(false)
  })
})
