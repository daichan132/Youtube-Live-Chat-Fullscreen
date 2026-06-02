import { describe, expect, it } from 'vitest'
import {
  deriveClippedLayout,
  deriveResizedLayout,
  fitLayoutWithinViewportWidth,
  getControlRailTop,
  isSameClip,
  isSameLayoutGeometry,
  measureClipFromBody,
} from './clipGeometry'

const createBody = () => document.implementation.createHTMLDocument('').body

describe('clipGeometry', () => {
  it('measures clip values from header and message input elements', () => {
    const body = createBody()

    const header = body.ownerDocument.createElement('yt-live-chat-header-renderer')
    Object.defineProperty(header, 'clientHeight', { value: 40, configurable: true })

    const input = body.ownerDocument.createElement('yt-live-chat-message-input-renderer')
    Object.defineProperty(input, 'clientHeight', { value: 24, configurable: true })

    body.appendChild(header)
    body.appendChild(input)

    expect(measureClipFromBody(body)).toEqual({ header: 28, input: 24 })
  })

  it('uses the taller input candidate when message input and restricted participation coexist', () => {
    const body = createBody()

    const header = body.ownerDocument.createElement('yt-live-chat-header-renderer')
    Object.defineProperty(header, 'clientHeight', { value: 40, configurable: true })

    const input = body.ownerDocument.createElement('yt-live-chat-message-input-renderer')
    Object.defineProperty(input, 'clientHeight', { value: 0, configurable: true })

    const restricted = body.ownerDocument.createElement('yt-live-chat-restricted-participation-renderer')
    Object.defineProperty(restricted, 'clientHeight', { value: 26, configurable: true })

    body.appendChild(header)
    body.appendChild(input)
    body.appendChild(restricted)

    expect(measureClipFromBody(body)).toEqual({ header: 28, input: 26 })
  })

  it('falls back to input panel when renderer-specific elements are missing', () => {
    const body = createBody()

    const header = body.ownerDocument.createElement('yt-live-chat-header-renderer')
    Object.defineProperty(header, 'clientHeight', { value: 40, configurable: true })

    const inputPanel = body.ownerDocument.createElement('div')
    inputPanel.id = 'input-panel'
    Object.defineProperty(inputPanel, 'clientHeight', { value: 28, configurable: true })

    body.appendChild(header)
    body.appendChild(inputPanel)

    expect(measureClipFromBody(body)).toEqual({ header: 28, input: 28 })
  })

  it('clamps missing clip elements to zero', () => {
    expect(measureClipFromBody(createBody())).toEqual({ header: 0, input: 0 })
  })

  it('derives clipped layout from base layout and clip values', () => {
    const baseLayout = {
      coordinates: { x: 10, y: 20 },
      size: { width: 300, height: 200 },
    }

    expect(deriveClippedLayout(baseLayout, { header: 28, input: 24 })).toEqual({
      coordinates: { x: 10, y: -8 },
      size: { width: 300, height: 252 },
    })
  })

  it('matches clip and layout equality helpers', () => {
    expect(isSameClip({ header: 10, input: 5 }, { header: 10, input: 5 })).toBe(true)
    expect(isSameClip({ header: 10, input: 5 }, { header: 10, input: 6 })).toBe(false)

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
        isClipPath: false,
        clipInput: 0,
        viewportHeight: 500,
        viewportPadding: 4,
      }),
    ).toBe(206)
  })

  it('uses the clipped visible bottom when positioning the control rail', () => {
    expect(
      getControlRailTop({
        chatHeight: 252,
        containerTop: 10,
        controlHeight: 40,
        gap: 6,
        isClipPath: true,
        clipInput: 20,
        viewportHeight: 500,
        viewportPadding: 4,
      }),
    ).toBe(238)
  })

  it('keeps the control rail inside the viewport bottom', () => {
    expect(
      getControlRailTop({
        chatHeight: 500,
        containerTop: 0,
        controlHeight: 40,
        gap: 6,
        isClipPath: false,
        clipInput: 0,
        viewportHeight: 500,
        viewportPadding: 4,
      }),
    ).toBe(456)
  })

  it('derives resized layout for top-left resizing', () => {
    expect(
      deriveResizedLayout({
        startCoordinates: { x: 100, y: 80 },
        currentSize: { width: 300, height: 200 },
        direction: 'topLeft',
        delta: { width: 40, height: 20 },
      }),
    ).toEqual({
      coordinates: { x: 60, y: 60 },
      size: { width: 340, height: 220 },
    })
  })

  it.each([
    ['top', { width: 0, height: 20 }, { x: 100, y: 60 }],
    ['left', { width: 40, height: 0 }, { x: 60, y: 80 }],
    ['bottomLeft', { width: 40, height: 20 }, { x: 60, y: 80 }],
    ['topRight', { width: 40, height: 20 }, { x: 100, y: 60 }],
  ] as const)('derives resized coordinates for %s resizing', (direction, delta, coordinates) => {
    expect(
      deriveResizedLayout({
        startCoordinates: { x: 100, y: 80 },
        currentSize: { width: 300, height: 200 },
        direction,
        delta,
      }).coordinates,
    ).toEqual(coordinates)
  })

  it('clamps resized coordinates to the viewport origin', () => {
    expect(
      deriveResizedLayout({
        startCoordinates: { x: 10, y: 8 },
        currentSize: { width: 300, height: 200 },
        direction: 'topLeft',
        delta: { width: 40, height: 20 },
      }).coordinates,
    ).toEqual({ x: 0, y: 0 })
  })

  it('keeps coordinates while resizing from the bottom-right corner', () => {
    expect(
      deriveResizedLayout({
        startCoordinates: { x: 100, y: 80 },
        currentSize: { width: 300, height: 200 },
        direction: 'bottomRight',
        delta: { width: 40, height: 20 },
      }),
    ).toEqual({
      coordinates: { x: 100, y: 80 },
      size: { width: 340, height: 220 },
    })
  })
})
