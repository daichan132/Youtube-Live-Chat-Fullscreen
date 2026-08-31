import { describe, expect, it } from 'vitest'
import { fitGeometryToViewport } from './fitGeometryToViewport'

describe('fitGeometryToViewport', () => {
  it('preserves geometry that already fits', () => {
    const geometry = {
      coordinates: { x: 40, y: 50 },
      size: { width: 400, height: 300 },
    }

    expect(fitGeometryToViewport(geometry, { width: 1000, height: 800 }, 10)).toEqual(geometry)
  })

  it('clamps both axes while preserving the requested size', () => {
    expect(
      fitGeometryToViewport(
        {
          coordinates: { x: 900, y: 700 },
          size: { width: 400, height: 300 },
        },
        { width: 800, height: 600 },
        10,
      ),
    ).toEqual({
      coordinates: { x: 390, y: 290 },
      size: { width: 400, height: 300 },
    })
  })

  it('shrinks oversized geometry and keeps it inside the padded viewport', () => {
    expect(
      fitGeometryToViewport(
        {
          coordinates: { x: -100, y: -200 },
          size: { width: 1200, height: 900 },
        },
        { width: 800, height: 600 },
        10,
      ),
    ).toEqual({
      coordinates: { x: 10, y: 10 },
      size: { width: 780, height: 580 },
    })
  })

  it('replaces non-finite values with safe bounds', () => {
    const result = fitGeometryToViewport(
      {
        coordinates: { x: Number.NaN, y: Number.POSITIVE_INFINITY },
        size: { width: Number.NEGATIVE_INFINITY, height: Number.NaN },
      },
      { width: 800, height: 600 },
      10,
    )

    expect(result).toEqual({
      coordinates: { x: 10, y: 10 },
      size: { width: 240, height: 180 },
    })
  })
})
