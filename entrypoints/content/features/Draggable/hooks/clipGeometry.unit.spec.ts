import { describe, expect, it } from 'vitest'
import { deriveResizedLayout } from './clipGeometry'

describe('clipGeometry', () => {
  it.each([
    ['top', { width: 0, height: -20 }, { x: 100, y: 60 }, { width: 300, height: 220 }],
    ['right', { width: 40, height: 0 }, { x: 100, y: 80 }, { width: 340, height: 200 }],
    ['bottom', { width: 0, height: 20 }, { x: 100, y: 80 }, { width: 300, height: 220 }],
    ['left', { width: -40, height: 0 }, { x: 60, y: 80 }, { width: 340, height: 200 }],
    ['topRight', { width: 40, height: -20 }, { x: 100, y: 60 }, { width: 340, height: 220 }],
    ['bottomRight', { width: 40, height: 20 }, { x: 100, y: 80 }, { width: 340, height: 220 }],
    ['bottomLeft', { width: -40, height: 20 }, { x: 60, y: 80 }, { width: 340, height: 220 }],
    ['topLeft', { width: -40, height: -20 }, { x: 60, y: 60 }, { width: 340, height: 220 }],
  ] as const)('derives resized layout for %s using raw pointer movement', (direction, delta, coordinates, size) => {
    expect(
      deriveResizedLayout({
        startCoordinates: { x: 100, y: 80 },
        currentSize: { width: 300, height: 200 },
        direction,
        delta,
      }),
    ).toEqual({ coordinates, size })
  })

  it.each([
    ['top', { width: 40, height: -20 }, { x: 100, y: 60 }, { width: 300, height: 220 }],
    ['right', { width: 40, height: 25 }, { x: 100, y: 80 }, { width: 340, height: 200 }],
    ['bottom', { width: -40, height: 20 }, { x: 100, y: 80 }, { width: 300, height: 220 }],
    ['left', { width: -40, height: -10 }, { x: 60, y: 80 }, { width: 340, height: 200 }],
  ] as const)('ignores diagonal pointer drift along the fixed axis of the %s edge', (direction, delta, coordinates, size) => {
    expect(
      deriveResizedLayout({
        startCoordinates: { x: 100, y: 80 },
        currentSize: { width: 300, height: 200 },
        direction,
        delta,
      }),
    ).toEqual({ coordinates, size })
  })

  it('clamps resized coordinates to the viewport origin', () => {
    expect(
      deriveResizedLayout({
        startCoordinates: { x: 10, y: 8 },
        currentSize: { width: 300, height: 200 },
        direction: 'topLeft',
        delta: { width: -40, height: -20 },
      }).coordinates,
    ).toEqual({ x: 0, y: 0 })
  })
})
