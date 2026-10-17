import { describe, expect, it } from 'vitest'
import { deriveResizedLayout, getControlRailTop } from './clipGeometry'

describe('clipGeometry', () => {
  it('places the control rail below the visible chat bottom', () => {
    expect(
      getControlRailTop({
        chatHeight: 200,
        containerTop: 50,
        controlHeight: 40,
        gap: 6,
        viewportHeight: 500,
        viewportPadding: 4,
      }),
    ).toBe(206)
  })

  it('uses the visible panel bottom when positioning the control rail', () => {
    expect(
      getControlRailTop({
        chatHeight: 200,
        containerTop: 10,
        controlHeight: 40,
        gap: 6,
        viewportHeight: 500,
        viewportPadding: 4,
      }),
    ).toBe(206)
  })

  it('keeps the control rail inside the viewport bottom', () => {
    expect(
      getControlRailTop({
        chatHeight: 500,
        containerTop: 0,
        controlHeight: 40,
        gap: 6,
        viewportHeight: 500,
        viewportPadding: 4,
      }),
    ).toBe(456)
  })

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
