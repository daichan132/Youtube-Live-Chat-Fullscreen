import { describe, expect, it } from 'vitest'
import { deriveClippedLayout, isSameClip, isSameLayoutGeometry, measureClipFromBody } from './clipGeometry'

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

    expect(measureClipFromBody(body)).toEqual({ header: 32, input: 20 })
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

    expect(measureClipFromBody(body)).toEqual({ header: 32, input: 22 })
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

    expect(measureClipFromBody(body)).toEqual({ header: 32, input: 24 })
  })

  it('clamps missing clip elements to zero', () => {
    expect(measureClipFromBody(createBody())).toEqual({ header: 0, input: 0 })
  })

  it('derives clipped layout from base layout and clip values', () => {
    const baseLayout = {
      coordinates: { x: 10, y: 20 },
      size: { width: 300, height: 200 },
    }

    expect(deriveClippedLayout(baseLayout, { header: 32, input: 20 })).toEqual({
      coordinates: { x: 10, y: -12 },
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
})
