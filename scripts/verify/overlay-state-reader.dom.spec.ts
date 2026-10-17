import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readOverlayState } from './overlay-state-reader.mjs'

beforeEach(() => {
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
})

afterEach(() => {
  document.body.replaceChildren()
  Reflect.deleteProperty(document, 'fullscreenElement')
  vi.restoreAllMocks()
})

describe('verification overlay state reader', () => {
  it('preserves the capture schema and reports missing surfaces as null', () => {
    document.body.innerHTML = '<iframe id="chatframe"></iframe><iframe data-ylc-settings-frame></iframe>'

    expect(readOverlayState()).toEqual({
      fullscreen: false,
      overlayMounted: false,
      elements: {
        resizable: null,
        frame: null,
        chatInner: null,
        controlRail: null,
        settingsButton: null,
        dragHandle: null,
        extensionIframe: null,
      },
    })
  })

  it('reads nested shadow surfaces and keeps the rounded geometry and CSS fields', () => {
    document.body.innerHTML = '<iframe id="chatframe"></iframe><div id="shadow-root-live-chat"></div>'
    const host = document.getElementById('shadow-root-live-chat')
    if (!host) throw new Error('Missing overlay host')
    const outer = host.attachShadow({ mode: 'open' })
    outer.innerHTML = '<div data-ylc-overlay-container><div id="nested-host"></div></div>'
    const nestedHost = outer.getElementById('nested-host')
    if (!nestedHost) throw new Error('Missing nested host')
    const inner = nestedHost.attachShadow({ mode: 'open' })
    inner.innerHTML = `
      <div data-ylc-resizable>
        <div data-ylc-draggable-frame>
          <div data-ylc-chat-inner><iframe data-ylc-chat="true"></iframe></div>
          <div data-ylc-control-rail>
            <button data-ylc-settings-btn></button>
            <button data-ylc-drag-handle></button>
          </div>
        </div>
      </div>
    `
    for (const element of inner.querySelectorAll<HTMLElement>('*')) {
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(10.6, 20.3, 240.2, 180.6))
      Object.assign(element.style, {
        opacity: '0.4',
        pointerEvents: 'none',
        display: 'block',
        backgroundColor: 'rgb(10, 20, 30)',
        transform: 'translateX(2px)',
      })
    }
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: host })

    const state = readOverlayState()

    expect(state.fullscreen).toBe(true)
    expect(state.overlayMounted).toBe(true)
    expect(Object.values(state.elements).every(element => element !== null)).toBe(true)
    expect(state.elements.dragHandle).toEqual({
      tag: 'button',
      x: 11,
      y: 20,
      width: 240,
      height: 181,
      opacity: '0.4',
      pointerEvents: 'none',
      display: 'block',
      background: 'rgb(10, 20, 30)',
      transform: 'translateX(2px)',
    })
    expect(state.elements.extensionIframe?.tag).toBe('iframe')
    expect(state).not.toHaveProperty('extensionDomExpected')
  })

  it.each([
    { html: '<div id="shadow-root-live-chat"></div>', host: true, slot: false },
    { html: '<div id="switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec"></div>', host: false, slot: true },
    { html: '<div data-ylc-overlay-container></div>', host: false, slot: false },
    { html: '<iframe data-ylc-chat="true"></iframe>', host: false, slot: false },
  ])('preserves the inspector mount signals for $html', ({ html, host, slot }) => {
    document.body.innerHTML = html
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.body.firstElementChild })

    const state = readOverlayState({ includeDiagnostics: true })

    expect(Object.keys(state)).toEqual([
      'url',
      'fullscreen',
      'extensionDomExpected',
      'extensionDomMounted',
      'extensionHostMounted',
      'switchButtonSlotMounted',
      'overlayMounted',
      'elements',
    ])
    expect(state).toMatchObject({
      url: window.location.href,
      fullscreen: true,
      extensionDomExpected: true,
      extensionDomMounted: true,
      extensionHostMounted: host,
      switchButtonSlotMounted: slot,
    })
  })

  it('runs after serialization without module closures and distinguishes fullscreen from mounted DOM', () => {
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.documentElement })
    const evaluateSerialized = new Function(`return (${readOverlayState.toString()})({ includeDiagnostics: true })`)

    expect(evaluateSerialized()).toMatchObject({
      fullscreen: true,
      extensionDomExpected: true,
      extensionDomMounted: false,
      extensionHostMounted: false,
      switchButtonSlotMounted: false,
      overlayMounted: false,
    })
  })
})
