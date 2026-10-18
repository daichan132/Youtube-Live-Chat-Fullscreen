import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { ChatRuntimeImpl } from './ChatRuntime'

const videoId = 'privacy-fixture-video-id'
const chatText = 'privacy-fixture-chat-message'
const viewerName = 'privacy-fixture-viewer-name'
const continuationToken = 'privacy-fixture-continuation-token'
const linkedToken = 'privacy-fixture-linked-token'
const linkedUrl = `https://example.invalid/message?token=${linkedToken}`
const chatUrl = `https://www.youtube.com/live_chat?v=${videoId}&continuation=${continuationToken}`
let runtime: ChatRuntimeImpl | null = null

beforeEach(() => {
  vi.useFakeTimers()
  document.body.replaceChildren()
  window.history.replaceState({}, '', `/watch?v=${videoId}`)
})

afterEach(() => {
  runtime?.stop()
  runtime = null
  Reflect.deleteProperty(document, 'fullscreenElement')
  document.body.replaceChildren()
  window.history.replaceState({}, '', '/')
  vi.clearAllTimers()
  vi.useRealTimers()
})

it('exports useful active-chat diagnostics without the loaded chat contents, viewer identity, or URLs', () => {
  const watch = document.createElement('ytd-watch-flexy')
  watch.setAttribute('video-id', videoId)
  watch.setAttribute('is-live-now', '')
  const player = document.createElement('div')
  player.id = 'movie_player'
  const controls = document.createElement('div')
  controls.className = 'ytp-right-controls'
  player.append(controls)
  const nativeHost = document.createElement('ytd-live-chat-frame')
  nativeHost.setAttribute('video-id', videoId)
  const iframe = document.createElement('iframe')
  iframe.id = 'chatframe'
  iframe.src = chatUrl
  nativeHost.append(iframe)
  watch.append(player, nativeHost)
  document.body.append(watch)

  const loadedDocument = document.implementation.createHTMLDocument('')
  loadedDocument.body.innerHTML = `
    <yt-live-chat-renderer>
      <yt-live-chat-item-list-renderer>
        <yt-live-chat-text-message-renderer>
          <span id="author-name">${viewerName}</span>
          <span id="message">${chatText}</span>
          <a href="${linkedUrl}">Message link</a>
        </yt-live-chat-text-message-renderer>
      </yt-live-chat-item-list-renderer>
    </yt-live-chat-renderer>
  `
  // jsdom does not navigate remote iframe documents. Supply the browser-owned
  // loaded document while keeping observation, decisions, and resource leases real.
  const chatDocument = new Proxy(loadedDocument, {
    get(target, key) {
      if (key === 'location') return { href: chatUrl }
      if (key === 'referrer') return window.location.href
      if (key === 'readyState') return 'complete'
      const value = Reflect.get(target, key, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  Object.defineProperty(iframe, 'contentDocument', { configurable: true, get: () => chatDocument })
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => player })

  runtime = new ChatRuntimeImpl()
  runtime.setEnabled(true)
  runtime.setProfile(DEFAULT_CHAT_PROFILE)
  runtime.start()
  vi.advanceTimersByTime(20)
  const overlayRoot = runtime.getSnapshot().overlayRoot
  if (!overlayRoot) throw new Error('Expected a mounted overlay for the loaded live chat')
  const carrier = document.createElement('div')
  overlayRoot.append(carrier)
  runtime.setOverlayContainer(carrier)
  vi.advanceTimersByTime(20)

  expect(runtime.getSnapshot()).toMatchObject({ status: 'active', mode: 'live', showOverlay: true, loading: false })
  expect(carrier.querySelector('iframe')).toBe(iframe)
  expect(iframe.contentDocument?.body.textContent).toContain(chatText)
  expect(iframe.contentDocument?.querySelector('#author-name')?.textContent).toBe(viewerName)
  expect(iframe.contentDocument?.querySelector('a')?.href).toBe(linkedUrl)

  const report = runtime.getDiagnosticReport()
  expect(report.page).toMatchObject({ mode: 'live', fullscreen: true, capabilities: { canBorrowNativeChat: true } })
  expect(report.runtime).toMatchObject({ status: 'active', leases: { chat: { kind: 'borrowed-live', state: 'attached' } } })
  expect(report.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ event: 'observation-changed' }),
      expect.objectContaining({ event: 'plan-changed' }),
      expect.objectContaining({ event: 'lease-acquired' }),
    ]),
  )
  const serialized = JSON.stringify(report)
  for (const privateValue of [videoId, chatText, viewerName, linkedUrl, linkedToken, chatUrl, continuationToken, window.location.href]) {
    expect(serialized).not.toContain(privateValue)
  }
  expect(serialized).not.toMatch(/https?:\/\//)
})
