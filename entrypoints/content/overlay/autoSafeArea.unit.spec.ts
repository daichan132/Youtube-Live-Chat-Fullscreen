import { describe, expect, it } from 'vitest'
import { chooseAutoSafePlacement, scorePlacement, shouldApplyAutoSafePlacement } from './autoSafeArea'

const current = { coordinates: { x: 870, y: 10 }, size: { width: 400, height: 300 } }

describe('Auto Safe Area', () => {
  it('selects the nearest corner that removes the overlap', () => {
    const placement = chooseAutoSafePlacement(current, { width: 1280, height: 720 }, [
      { kind: 'menu', rect: { x: 850, y: 0, width: 430, height: 360 } },
    ])

    expect(placement.best.geometry.coordinates).toEqual({ x: 870, y: 410 })
    expect(shouldApplyAutoSafePlacement(placement)).toBe(true)
  })

  it('scores obstacle overlap, distance, and the clipped visible area independently', () => {
    expect(
      scorePlacement(
        { coordinates: { x: -20, y: 30 }, size: { width: 100, height: 80 } },
        { coordinates: { x: 10, y: -10 }, size: { width: 100, height: 80 } },
        { width: 120, height: 90 },
        [{ kind: 'caption', rect: { x: 0, y: 40, width: 30, height: 20 } }],
      ),
    ).toEqual({ overlapArea: 600, movementDistance: 50, visibleArea: 4800 })
  })

  it.each([
    { boundary: 'just below 12% overlap', size: { width: 400, height: 250 }, area: 100000, overlap: 11999, remaining: 0, apply: false },
    { boundary: 'exactly 12% overlap', size: { width: 400, height: 250 }, area: 100000, overlap: 12000, remaining: 0, apply: true },
    {
      boundary: 'just below 2400 px² improvement',
      size: { width: 100, height: 100 },
      area: 10000,
      overlap: 3000,
      remaining: 601,
      apply: false,
    },
    {
      boundary: 'exactly 2400 px² improvement',
      size: { width: 100, height: 100 },
      area: 10000,
      overlap: 3000,
      remaining: 600,
      apply: true,
    },
    {
      boundary: 'just below 5% improvement',
      size: { width: 400, height: 250 },
      area: 100000,
      overlap: 20000,
      remaining: 15001,
      apply: false,
    },
    { boundary: 'exactly 5% improvement', size: { width: 400, height: 250 }, area: 100000, overlap: 20000, remaining: 15000, apply: true },
  ])('applies the placement threshold at $boundary', ({ size, area, overlap, remaining, apply }) => {
    expect(
      shouldApplyAutoSafePlacement({
        current: {
          geometry: { coordinates: { x: 0, y: 0 }, size },
          score: { overlapArea: overlap, movementDistance: 0, visibleArea: area },
        },
        best: {
          geometry: { coordinates: { x: 100, y: 0 }, size },
          score: { overlapArea: remaining, movementDistance: 100, visibleArea: area },
        },
      }),
    ).toBe(apply)
  })
})
