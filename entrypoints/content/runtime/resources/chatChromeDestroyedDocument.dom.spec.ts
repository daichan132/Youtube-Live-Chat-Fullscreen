import { afterEach, expect, it, vi } from 'vitest'
import { createChatChromeLease } from './ChatChromeLease'
import { preserveChatScroll } from './ChatScrollAnchor'

const revokeNode = (element: HTMLElement) => {
  const dead = () => {
    throw new TypeError("can't access dead object")
  }
  vi.spyOn(element, 'nodeType', 'get').mockImplementation(dead)
  vi.spyOn(element, 'classList', 'get').mockImplementation(dead)
  vi.spyOn(element, 'style', 'get').mockImplementation(dead)
  vi.spyOn(element, 'ownerDocument', 'get').mockImplementation(dead)
  vi.spyOn(element, 'removeEventListener').mockImplementation(dead)
}

const createFrame = () => {
  const iframe = document.createElement('iframe')
  document.body.append(iframe)
  const doc = iframe.contentDocument
  if (!doc) throw new Error('Expected a same-origin iframe')
  doc.body.innerHTML = '<yt-live-chat-header-renderer></yt-live-chat-header-renderer><div id="input-panel"></div>'
  return { iframe, doc, body: doc.body }
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

it('releases a revoked iframe body and continues applying chrome to its replacement', () => {
  const old = createFrame()
  const lease = createChatChromeLease()
  lease.sync(old.iframe, 'collapsed')
  expect(old.body.classList.contains('chat-only-display')).toBe(true)

  const oldChrome = old.body.querySelector('yt-live-chat-header-renderer') as HTMLElement
  revokeNode(old.body)
  revokeNode(oldChrome)
  const next = createFrame()
  expect(() => lease.sync(next.iframe, 'collapsed')).not.toThrow()
  expect(next.body.classList.contains('chat-only-display')).toBe(true)
  expect(() => lease.release()).not.toThrow()
  expect(next.body.classList.contains('chat-only-display')).toBe(false)
})

it('stops a transition after its iframe realm is destroyed without reading revoked wrappers', () => {
  const { body } = createFrame()
  body.innerHTML = '<yt-live-chat-item-list-renderer><div id="item-scroller"></div></yt-live-chat-item-list-renderer>'
  const scroller = body.querySelector('#item-scroller') as HTMLElement
  Object.defineProperty(scroller, 'clientHeight', { value: 100 })
  Object.defineProperty(scroller, 'scrollHeight', { value: 200 })
  const lease = preserveChatScroll(body, 310)
  expect(lease).not.toBeNull()

  revokeNode(body)
  expect(() => lease?.restore()).not.toThrow()
  expect(() => lease?.stop()).not.toThrow()
})
