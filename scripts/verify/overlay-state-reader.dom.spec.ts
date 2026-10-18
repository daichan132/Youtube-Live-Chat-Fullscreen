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

  it('identifies each nested shadow surface independently, including after serialization', () => {
    document.body.innerHTML =
      '<iframe id="chatframe"></iframe><iframe data-ylc-settings-frame></iframe><div id="shadow-root-live-chat"></div>'
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
    const style = {
      opacity: '0.4',
      pointerEvents: 'none',
      display: 'block',
      backgroundColor: 'rgb(10, 20, 30)',
      transform: 'translateX(2px)',
    }
    const setRect = (selector: string, x: number, y: number, width: number, height: number) => {
      const element = inner.querySelector<HTMLElement>(selector)
      if (!element) throw new Error(`Missing fixture surface: ${selector}`)
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(x, y, width, height))
      Object.assign(element.style, style)
    }
    // Different bounds make a selector mix-up observable; identical mocked bounds
    // would accept the chat iframe in place of its container or the two buttons swapped.
    setRect('[data-ylc-resizable]', 10.6, 20.3, 240.2, 180.6)
    setRect('[data-ylc-draggable-frame]', 12, 22, 236, 176)
    setRect('[data-ylc-chat-inner]', 14, 24, 200, 172)
    setRect('[data-ylc-control-rail]', 214, 24, 32, 64)
    setRect('[data-ylc-settings-btn]', 214, 24, 32, 32)
    setRect('[data-ylc-drag-handle]', 214, 56, 32, 32)
    setRect('iframe[data-ylc-chat="true"]', 16, 26, 196, 168)
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: host })

    const css = {
      opacity: '0.4',
      pointerEvents: 'none',
      display: 'block',
      background: 'rgb(10, 20, 30)',
      transform: 'translateX(2px)',
    }
    const expected = {
      fullscreen: true,
      overlayMounted: true,
      elements: {
        resizable: { tag: 'div', x: 11, y: 20, width: 240, height: 181, ...css },
        frame: { tag: 'div', x: 12, y: 22, width: 236, height: 176, ...css },
        chatInner: { tag: 'div', x: 14, y: 24, width: 200, height: 172, ...css },
        controlRail: { tag: 'div', x: 214, y: 24, width: 32, height: 64, ...css },
        settingsButton: { tag: 'button', x: 214, y: 24, width: 32, height: 32, ...css },
        dragHandle: { tag: 'button', x: 214, y: 56, width: 32, height: 32, ...css },
        extensionIframe: { tag: 'iframe', x: 16, y: 26, width: 196, height: 168, ...css },
      },
    }
    expect(readOverlayState()).toEqual(expected)
    // Verification CLIs execute the serialized function in the inspected page.
    const evaluateSerialized = new Function(`return (${readOverlayState.toString()})()`)
    expect(evaluateSerialized()).toEqual(expected)
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
