import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  hasPlayableChat,
  hasYouTubePlayerError,
  isExtensionArchiveChatPlayable,
  isExtensionChatLoaded,
  isNativeChatUnavailable,
  isNativeLiveChatPlayable,
} from './diagnostics'
import { PAGE_HELPERS_INIT_SCRIPT } from './pageHelpers'

const originalHelpers = Object.getOwnPropertyDescriptor(window, '__ylcHelpers')

afterEach(() => {
  document.body.replaceChildren()
  if (originalHelpers) Object.defineProperty(window, '__ylcHelpers', originalHelpers)
  else Reflect.deleteProperty(window, '__ylcHelpers')
})

const readyChat = '<yt-live-chat-renderer><yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer></yt-live-chat-renderer>'
const readyChatWithQuotedUnavailableMessage = `
  <yt-live-chat-renderer>
    <yt-live-chat-item-list-renderer>
      <yt-live-chat-text-message-renderer>A viewer says chat is disabled, but messages are arriving.</yt-live-chat-text-message-renderer>
    </yt-live-chat-item-list-renderer>
  </yt-live-chat-renderer>
`

const mountChat = (html: string, href = 'https://www.youtube.com/live_chat?v=fixture') => {
  const host = document.createElement('div')
  host.id = 'shadow-root-live-chat'
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  const iframe = document.createElement('iframe')
  iframe.setAttribute('data-ylc-chat', 'true')
  iframe.src = href
  root.append(iframe)
  const chatDocument = iframe.contentDocument
  if (!chatDocument) throw new Error('The fixture chat document is missing.')
  chatDocument.write(`<!doctype html><body>${html}</body>`)
  chatDocument.close()
  return iframe
}

const mountNativeChat = (html: string, path: string) => {
  const host = document.createElement('ytd-live-chat-frame')
  const iframe = document.createElement('iframe')
  iframe.id = 'chatframe'
  iframe.src = `https://www.youtube.com${path}`
  host.append(iframe)
  document.body.append(host)
  const chatDocument = iframe.contentDocument
  if (!chatDocument) throw new Error('The native fixture chat document is missing.')
  chatDocument.write(`<!doctype html><body>${html}</body>`)
  chatDocument.close()
}

describe('native chat source preconditions', () => {
  beforeEach(() => PAGE_HELPERS_INIT_SCRIPT())

  it.each(['/live_chat?v=fixture', '/live_chat_replay?continuation=fixture'])(
    'keeps a ready source playable at %s when viewers discuss unavailable chat',
    path => {
      mountNativeChat(
        `<yt-live-chat-renderer><yt-live-chat-item-list-renderer>
          <yt-live-chat-text-message-renderer>A viewer quotes: live chat replay is not available.</yt-live-chat-text-message-renderer>
          <yt-live-chat-text-message-renderer>Another viewer says chat is disabled on a different stream.</yt-live-chat-text-message-renderer>
          <yt-live-chat-text-message-renderer>Someone asks what "live chat is disabled" means.</yt-live-chat-text-message-renderer>
        </yt-live-chat-item-list-renderer></yt-live-chat-renderer>`,
        path,
      )

      expect(hasPlayableChat()).toBe(true)
      expect(isNativeChatUnavailable()).toBe(false)
      if (path.startsWith('/live_chat?')) expect(isNativeLiveChatPlayable()).toBe(true)
    },
  )

  it.each(['/live_chat?v=fixture', '/live_chat_replay?continuation=fixture'])(
    'rejects a structural source error at %s even when ready renderers remain',
    path => {
      mountNativeChat(
        `${readyChat}<yt-live-chat-unavailable-message-renderer>このチャットは利用できません</yt-live-chat-unavailable-message-renderer>`,
        path,
      )

      expect(hasPlayableChat()).toBe(false)
      expect(isNativeChatUnavailable()).toBe(true)
      if (path.startsWith('/live_chat?')) expect(isNativeLiveChatPlayable()).toBe(false)
    },
  )

  it.each([
    ['plain unavailable response', 'Chat is disabled'],
    ['incomplete chat with an error', '<yt-live-chat-renderer>Live chat replay is not available</yt-live-chat-renderer>'],
  ])('preserves text error detection for %s', (_name, html) => {
    mountNativeChat(html, '/live_chat?v=fixture')

    expect(hasPlayableChat()).toBe(false)
    expect(isNativeLiveChatPlayable()).toBe(false)
    expect(isNativeChatUnavailable()).toBe(true)
  })
})

describe('isExtensionChatLoaded', () => {
  beforeEach(() => PAGE_HELPERS_INIT_SCRIPT())

  it.each(['/live_chat?v=fixture', '/live_chat_replay?continuation=fixture'])(
    'accepts ready chat at %s even when a viewer quotes unavailable text',
    path => {
      mountChat(readyChatWithQuotedUnavailableMessage, `https://www.youtube.com${path}`)
      expect(isExtensionChatLoaded()).toBe(true)
    },
  )

  it.each([
    ['empty document', ''],
    ['loading document', '<yt-live-chat-renderer>Loading chat</yt-live-chat-renderer>'],
    ['orphan message list', '<yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer>'],
  ])('does not call a non-blank URL loaded: %s', (_name, html) => {
    mountChat(html)
    expect(isExtensionChatLoaded()).toBe(false)
  })

  it('rejects a structural unavailable message even when chat renderers remain', () => {
    mountChat(`${readyChat}<yt-live-chat-unavailable-message-renderer>Chat unavailable</yt-live-chat-unavailable-message-renderer>`)
    expect(isExtensionChatLoaded()).toBe(false)
  })

  it.each([
    'https://untrusted.example/live_chat?v=fixture',
    'https://www.youtube.com/redirect?next=/live_chat',
    'https://www.youtube.com/live_chat_extra?v=fixture',
    'about:blank',
  ])('rejects a ready document outside the chat source boundary: %s', href => {
    mountChat(readyChat, href)
    expect(isExtensionChatLoaded()).toBe(false)
  })

  it('does not fall back to a trusted src when its current document is missing', () => {
    const iframe = mountChat(readyChat)
    Object.defineProperty(iframe, 'contentDocument', { value: null })
    expect(isExtensionChatLoaded()).toBe(false)
  })

  it('does not fall back to a trusted src when its current document is inaccessible', () => {
    const iframe = mountChat(readyChat)
    Object.defineProperty(iframe, 'contentDocument', {
      get() {
        throw new DOMException('Access denied', 'SecurityError')
      },
    })
    expect(isExtensionChatLoaded()).toBe(false)
  })

  it('waits when no extension iframe exists', () => {
    expect(isExtensionChatLoaded()).toBe(false)
  })
})

describe('isExtensionArchiveChatPlayable', () => {
  beforeEach(() => PAGE_HELPERS_INIT_SCRIPT())

  it('accepts a native replay whose ready viewer messages quote unavailable text', () => {
    mountChat(readyChatWithQuotedUnavailableMessage, 'https://www.youtube.com/live_chat_replay?continuation=fixture')
    expect(isExtensionArchiveChatPlayable()).toBe(true)
  })

  it.each([
    'https://www.youtube.com/live_chat?v=fixture',
    'https://untrusted.example/live_chat_replay?v=fixture',
    'https://www.youtube.com/live_chat_replay_extra?v=fixture',
  ])('rejects a ready document outside the replay source boundary: %s', href => {
    mountChat(readyChat, href)
    expect(isExtensionArchiveChatPlayable()).toBe(false)
  })

  it('rejects a managed iframe even when its replay document is ready', () => {
    const iframe = mountChat(readyChat, 'https://www.youtube.com/live_chat_replay?continuation=fixture')
    iframe.setAttribute('data-ylc-owned', 'true')
    expect(isExtensionArchiveChatPlayable()).toBe(false)
  })

  it('rejects a structural unavailable message even when replay renderers remain', () => {
    mountChat(
      `${readyChat}<yt-live-chat-unavailable-message-renderer>Replay unavailable</yt-live-chat-unavailable-message-renderer>`,
      'https://www.youtube.com/live_chat_replay?continuation=fixture',
    )
    expect(isExtensionArchiveChatPlayable()).toBe(false)
  })
})

describe('hasYouTubePlayerError', () => {
  it('detects an unavailable live stream recording error', () => {
    document.body.innerHTML = `
      <div id="movie_player">
        <div class="ytp-error">
          <div role="alert">This live stream recording is not available.</div>
        </div>
      </div>
    `

    expect(hasYouTubePlayerError()).toBe(true)
  })

  it('does not treat normal player content as an error', () => {
    document.body.innerHTML = `
      <div id="movie_player">
        <div role="alert">Subtitles are not available for this video.</div>
      </div>
    `

    expect(hasYouTubePlayerError()).toBe(false)
  })
})
