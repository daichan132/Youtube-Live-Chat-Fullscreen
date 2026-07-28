import { describe, expect, it } from 'vitest'
import { deriveResizedLayout, fitLayoutWithinViewportWidth, getControlRailTop, isSameLayoutGeometry } from './clipGeometry'

describe('clipGeometry', () => {
  it('matches layout equality helpers', () => {
    expect(
      isSameLayoutGeometry(
        { coordinates: { x: 1, y: 2 }, size: { width: 3, height: 4 } },
        { coordinates: { x: 1, y: 2 }, size: { width: 3, height: 4 } },
      ),
    ).toBe(true)

    expect(
      isSameLayoutGeometry(
        { coordinates: { x: 1, y: 2 }, size: { width: 3, height: 4 } },
        { coordinates: { x: 1, y: 3 }, size: { width: 3, height: 4 } },
      ),
    ).toBe(false)
  })

  it('shifts layout left when the right edge overflows the viewport', () => {
    expect(
      fitLayoutWithinViewportWidth(
        {
          coordinates: { x: 200, y: 10 },
          size: { width: 400, height: 300 },
        },
        500,
      ),
    ).toEqual({
      coordinates: { x: 100, y: 10 },
      size: { width: 400, height: 300 },
    })
  })

  it('shrinks layout width when shifting left would cross the viewport edge', () => {
    expect(
      fitLayoutWithinViewportWidth(
        {
          coordinates: { x: 50, y: 20 },
          size: { width: 600, height: 320 },
        },
        500,
      ),
    ).toEqual({
      coordinates: { x: 50, y: 20 },
      size: { width: 450, height: 320 },
    })
  })

  it('keeps layout unchanged when it already fits the viewport width', () => {
    const layout = {
      coordinates: { x: 30, y: 40 },
      size: { width: 200, height: 160 },
    }

    expect(fitLayoutWithinViewportWidth(layout, 500)).toBe(layout)
  })

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
