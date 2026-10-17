// Keep this function self-contained: Playwright serializes it into the page.
export const readOverlayState = ({ includeDiagnostics = false } = {}) => {
  const findDeep = predicate => {
    let found = null

    const walk = root => {
      for (const element of root.querySelectorAll('*')) {
        if (predicate(element)) {
          found = element
          return
        }
        if (element.shadowRoot) {
          walk(element.shadowRoot)
          if (found) return
        }
      }
    }

    walk(document)
    return found
  }

  const rectOf = element => {
    if (!element) return null
    const rect = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)
    return {
      tag: element.tagName.toLowerCase(),
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      opacity: style.opacity,
      pointerEvents: style.pointerEvents,
      display: style.display,
      background: style.backgroundColor,
      transform: style.transform,
    }
  }

  const controlRail = findDeep(element => element.hasAttribute('data-ylc-control-rail'))
  const frame = findDeep(element => element.hasAttribute('data-ylc-draggable-frame'))
  const resizable = findDeep(element => element.hasAttribute('data-ylc-resizable'))
  const chatInner = findDeep(element => element.hasAttribute('data-ylc-chat-inner'))
  const settingsButton = findDeep(element => element.hasAttribute('data-ylc-settings-btn'))
  const dragHandle = findDeep(element => element.hasAttribute('data-ylc-drag-handle'))
  const overlayContainer = findDeep(element => element.hasAttribute('data-ylc-overlay-container'))
  const extensionIframe = findDeep(element => element.matches?.('iframe[data-ylc-chat="true"]'))
  const fullscreen = document.fullscreenElement !== null
  const elements = {
    resizable: rectOf(resizable),
    frame: rectOf(frame),
    chatInner: rectOf(chatInner),
    controlRail: rectOf(controlRail),
    settingsButton: rectOf(settingsButton),
    dragHandle: rectOf(dragHandle),
    extensionIframe: rectOf(extensionIframe),
  }

  if (!includeDiagnostics) {
    return { fullscreen, overlayMounted: Boolean(overlayContainer), elements }
  }

  const extensionHost = document.getElementById('shadow-root-live-chat')
  const switchButtonSlot = document.getElementById('switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec')
  return {
    url: window.location.href,
    fullscreen,
    extensionDomExpected: fullscreen,
    extensionDomMounted: Boolean(extensionHost || switchButtonSlot || overlayContainer || extensionIframe),
    extensionHostMounted: Boolean(extensionHost),
    switchButtonSlotMounted: Boolean(switchButtonSlot),
    overlayMounted: Boolean(overlayContainer),
    elements,
  }
}
