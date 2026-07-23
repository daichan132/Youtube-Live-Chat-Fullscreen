import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_MEASURING_CLASS,
  IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_TRANSITION_CLASS,
} from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { createChatOnlyChromeController, resolveChatOnlyChromeTargets } from './chatOnlyChromeController'

const setHeight = (element: Element, height: number) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({ height }) as DOMRect,
    configurable: true,
  })
}

const appendChrome = (doc: Document) => {
  const header = doc.createElement('yt-live-chat-header-renderer')
  const inputPanel = doc.createElement('div')
  const input = doc.createElement('yt-live-chat-message-input-renderer')
  inputPanel.id = 'input-panel'
  inputPanel.appendChild(input)
  doc.body.append(header, inputPanel)
  setHeight(header, 54)
  setHeight(inputPanel, 112)
  setHeight(input, 96)
  return { header, inputPanel, input }
}

const createIframe = (initialDocument = document.implementation.createHTMLDocument('')) => {
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  let currentDocument = initialDocument
  Object.defineProperty(iframe, 'contentDocument', {
    get: () => currentDocument,
    configurable: true,
  })
  return {
    iframe,
    setDocument(nextDocument: Document) {
      currentDocument = nextDocument
    },
  }
}

const dispatchHeightTransitionEnd = (element: Element) => {
  const event = new Event('transitionend')
  Object.defineProperty(event, 'propertyName', { value: 'height' })
  element.dispatchEvent(event)
}

describe('chatOnlyChromeController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('resolves only the header and outer input panel', () => {
    const doc = document.implementation.createHTMLDocument('')
    const { header, inputPanel, input } = appendChrome(doc)

    const targets = resolveChatOnlyChromeTargets(doc.body)

    expect(targets.map(target => target.element)).toEqual([header, inputPanel])
    expect(targets.map(target => target.element)).not.toContain(input)
  })

  it('uses every outermost input variant only when #input-panel is absent', () => {
    const doc = document.implementation.createHTMLDocument('')
    const restricted = doc.createElement('yt-live-chat-restricted-participation-renderer')
    const nestedInput = doc.createElement('yt-live-chat-message-input-renderer')
    const signIn = doc.createElement('yt-live-chat-sign-in-prompt-renderer')
    restricted.appendChild(nestedInput)
    doc.body.append(restricted, signIn)

    const targets = resolveChatOnlyChromeTargets(doc.body)

    expect(targets.map(target => target.element)).toEqual([restricted, signIn])
  })

  it('measures and collapses only the two layout boundaries', () => {
    const doc = document.implementation.createHTMLDocument('')
    const { header, inputPanel, input } = appendChrome(doc)
    const inputRect = vi.spyOn(input, 'getBoundingClientRect')
    const { iframe } = createIframe(doc)
    const controller = createChatOnlyChromeController()

    controller.sync(iframe, 'collapsed')

    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('54px')
    expect(inputPanel.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('112px')
    expect(inputRect).not.toHaveBeenCalled()
  })

  it('settles expansion from transitionend and clears temporary metrics', () => {
    const doc = document.implementation.createHTMLDocument('')
    const { header, inputPanel } = appendChrome(doc)
    const { iframe } = createIframe(doc)
    const controller = createChatOnlyChromeController()
    controller.sync(iframe, 'collapsed')
    vi.runOnlyPendingTimers()

    controller.sync(iframe, 'expanded')
    dispatchHeightTransitionEnd(header)
    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_TRANSITION_CLASS)).toBe(true)

    dispatchHeightTransitionEnd(inputPanel)
    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_TRANSITION_CLASS)).toBe(false)
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
    expect(inputPanel.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
  })

  it('cancels stale completion work when hover reverses rapidly', () => {
    const doc = document.implementation.createHTMLDocument('')
    const { header } = appendChrome(doc)
    const { iframe } = createIframe(doc)
    const controller = createChatOnlyChromeController()

    controller.sync(iframe, 'collapsed')
    controller.sync(iframe, 'expanded')
    controller.sync(iframe, 'collapsed')
    vi.runOnlyPendingTimers()

    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_TRANSITION_CLASS)).toBe(false)
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('54px')
  })

  it('remeasures a replacement target when expansion reverses before settling', () => {
    const doc = document.implementation.createHTMLDocument('')
    const { inputPanel } = appendChrome(doc)
    const { iframe } = createIframe(doc)
    const controller = createChatOnlyChromeController()
    controller.sync(iframe, 'collapsed')
    vi.runOnlyPendingTimers()
    controller.sync(iframe, 'expanded')

    const replacement = doc.createElement('div')
    replacement.id = 'input-panel'
    setHeight(replacement, 84)
    inputPanel.replaceWith(replacement)
    controller.sync(iframe, 'collapsed')

    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    expect(replacement.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('84px')
    expect(inputPanel.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
  })

  it('cleans the old Document and applies current intent after an iframe navigation', () => {
    const firstDocument = document.implementation.createHTMLDocument('')
    const secondDocument = document.implementation.createHTMLDocument('')
    appendChrome(firstDocument)
    appendChrome(secondDocument)
    const session = createIframe(firstDocument)
    const onDocumentChange = vi.fn()
    const controller = createChatOnlyChromeController({ onDocumentChange })
    controller.sync(session.iframe, 'collapsed')

    session.setDocument(secondDocument)
    session.iframe.dispatchEvent(new Event('load'))

    expect(firstDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    expect(secondDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    expect(onDocumentChange).toHaveBeenCalledTimes(2)
  })

  it('remeasures and animates when the input boundary is replaced while collapsed', () => {
    const doc = document.implementation.createHTMLDocument('')
    const { header, inputPanel } = appendChrome(doc)
    const { iframe } = createIframe(doc)
    const controller = createChatOnlyChromeController()
    controller.sync(iframe, 'collapsed')
    vi.runOnlyPendingTimers()

    const replacement = doc.createElement('div')
    replacement.id = 'input-panel'
    setHeight(replacement, 80)
    inputPanel.replaceWith(replacement)
    controller.sync(iframe, 'expanded')

    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_TRANSITION_CLASS)).toBe(true)
    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_MEASURING_CLASS)).toBe(false)
    expect(replacement.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('80px')

    dispatchHeightTransitionEnd(header)
    dispatchHeightTransitionEnd(replacement)
    expect(replacement.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
  })

  it('remeasures the current natural height before expanding from rest', () => {
    const doc = document.implementation.createHTMLDocument('')
    const { header, inputPanel } = appendChrome(doc)
    const { iframe } = createIframe(doc)
    const controller = createChatOnlyChromeController()
    controller.sync(iframe, 'collapsed')
    vi.runOnlyPendingTimers()

    setHeight(inputPanel, 148)
    controller.sync(iframe, 'expanded')

    expect(inputPanel.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('148px')
    dispatchHeightTransitionEnd(header)
    dispatchHeightTransitionEnd(inputPanel)
    expect(inputPanel.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
  })

  it('animates targets that appear after an empty collapsed document', () => {
    const doc = document.implementation.createHTMLDocument('')
    const { iframe } = createIframe(doc)
    const controller = createChatOnlyChromeController()
    controller.sync(iframe, 'collapsed')
    vi.runOnlyPendingTimers()

    const { header, inputPanel } = appendChrome(doc)
    controller.sync(iframe, 'expanded')

    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_TRANSITION_CLASS)).toBe(true)
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('54px')
    expect(inputPanel.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('112px')
  })

  it('preserves a collapsed hold state across an iframe document change', () => {
    const firstDocument = document.implementation.createHTMLDocument('')
    const secondDocument = document.implementation.createHTMLDocument('')
    appendChrome(firstDocument)
    const { header, inputPanel } = appendChrome(secondDocument)
    const session = createIframe(firstDocument)
    const controller = createChatOnlyChromeController()
    controller.sync(session.iframe, 'collapsed')
    vi.runOnlyPendingTimers()
    controller.sync(session.iframe, 'hold')

    session.setDocument(secondDocument)
    session.iframe.dispatchEvent(new Event('load'))

    expect(secondDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('54px')
    expect(inputPanel.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('112px')
  })

  it('preserves a collapsed hold state when the iframe element changes', () => {
    const firstDocument = document.implementation.createHTMLDocument('')
    const secondDocument = document.implementation.createHTMLDocument('')
    appendChrome(firstDocument)
    const { header, inputPanel } = appendChrome(secondDocument)
    const firstSession = createIframe(firstDocument)
    const secondSession = createIframe(secondDocument)
    const controller = createChatOnlyChromeController()
    controller.sync(firstSession.iframe, 'collapsed')
    vi.runOnlyPendingTimers()
    controller.sync(firstSession.iframe, 'hold')

    controller.sync(secondSession.iframe, 'hold')

    expect(secondDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('54px')
    expect(inputPanel.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('112px')
  })

  it('preserves a collapsed hold state across a temporary missing iframe', () => {
    const firstDocument = document.implementation.createHTMLDocument('')
    const secondDocument = document.implementation.createHTMLDocument('')
    appendChrome(firstDocument)
    const { header, inputPanel } = appendChrome(secondDocument)
    const firstSession = createIframe(firstDocument)
    const secondSession = createIframe(secondDocument)
    const controller = createChatOnlyChromeController()
    controller.sync(firstSession.iframe, 'collapsed')
    vi.runOnlyPendingTimers()
    controller.sync(firstSession.iframe, 'hold')

    controller.sync(null, 'hold')
    controller.sync(secondSession.iframe, 'hold')

    expect(secondDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('54px')
    expect(inputPanel.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('112px')
  })

  it('does not preserve a pending collapsed hold after hold ends', () => {
    const firstDocument = document.implementation.createHTMLDocument('')
    const secondDocument = document.implementation.createHTMLDocument('')
    appendChrome(firstDocument)
    appendChrome(secondDocument)
    const firstSession = createIframe(firstDocument)
    const secondSession = createIframe(secondDocument)
    const controller = createChatOnlyChromeController()
    controller.sync(firstSession.iframe, 'collapsed')
    vi.runOnlyPendingTimers()
    controller.sync(firstSession.iframe, 'hold')
    controller.sync(null, 'hold')

    controller.sync(secondSession.iframe, 'expanded')

    expect(secondDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
  })

  it('removes all controller-owned styles on dispose', () => {
    const doc = document.implementation.createHTMLDocument('')
    const { header, inputPanel } = appendChrome(doc)
    const { iframe } = createIframe(doc)
    const controller = createChatOnlyChromeController()
    controller.sync(iframe, 'collapsed')

    controller.dispose()

    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_TRANSITION_CLASS)).toBe(false)
    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_MEASURING_CLASS)).toBe(false)
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
    expect(inputPanel.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
  })
})
