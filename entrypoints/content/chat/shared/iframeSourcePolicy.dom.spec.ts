import { afterEach, describe, expect, it } from 'vitest'
import { collectPageObservation } from '../../platform/youtube/collectPageObservation'
import { getCurrentLiveChatIframe, isLiveChatIframe, isReplayChatIframe, markChatIframeObservedForCurrentVideo } from './iframeDom'

const mountIframe = (src: string, documentHref?: string) => {
  window.history.replaceState({}, '', '/watch?v=current-video')
  const iframe = document.createElement('iframe')
  iframe.id = 'chatframe'
  iframe.src = src
  if (documentHref !== undefined) {
    Object.defineProperty(iframe, 'contentDocument', { value: { location: { href: documentHref } } })
  }
  document.body.appendChild(iframe)
  return iframe
}

describe('chat iframe source policy', () => {
  afterEach(() => {
    document.body.replaceChildren()
    window.history.replaceState({}, '', '/')
  })

  it.each([
    'https://attacker.example/live_chat?v=current-video',
    'https://attacker.example/live_chat_replay?v=current-video',
    'https://www.youtube.com.attacker.example/live_chat?v=current-video',
    'http://www.youtube.com/live_chat?v=current-video',
    'https://www.youtube.com/watch?v=current-video&next=/live_chat',
    'https://www.youtube.com/watch?v=current-video#/live_chat_replay',
    'https://www.youtube.com/live_chat_backup?v=current-video',
    'https://www.youtube.com/live_chat_replay/other?v=current-video',
    'javascript:void("/live_chat?v=current-video")',
    'data:text/html,/live_chat?v=current-video',
  ])('does not borrow an iframe with a chat-like string outside a trusted chat URL: %s', src => {
    const iframe = mountIframe(src)

    expect(isLiveChatIframe(iframe)).toBe(false)
    expect(isReplayChatIframe(iframe)).toBe(false)
    const observation = collectPageObservation()
    expect(observation.evidence).toMatchObject({
      sourceKind: null,
      capabilities: { canBorrowNativeChat: false },
    })
    expect(observation.targets.nativeChatIframe).toBeNull()
    expect(observation.targets.chatIframe).toBeNull()
    expect(getCurrentLiveChatIframe()).toBeNull()
  })

  it.each([
    ['/live_chat?v=current-video', 'live'],
    ['/live_chat_replay?v=current-video', 'archive'],
    ['https://www.youtube.com/live_chat?continuation=native', 'live'],
    ['https://www.youtube.com/live_chat_replay?continuation=native', 'archive'],
  ])('accepts an exact YouTube chat route: %s', (src, mode) => {
    const iframe = mountIframe(src)

    expect(isLiveChatIframe(iframe)).toBe(mode === 'live')
    expect(isReplayChatIframe(iframe)).toBe(mode === 'archive')
  })

  it('rejects a loaded non-chat document even when src still points at chat', () => {
    const iframe = mountIframe('/live_chat?v=current-video', 'https://www.youtube.com/watch?v=current-video&next=/live_chat')

    expect(isLiveChatIframe(iframe)).toBe(false)
    expect(isReplayChatIframe(iframe)).toBe(false)
  })

  it.each(['null', 'inaccessible', 'inaccessible URL'] as const)('rejects a %s document even when src still points at chat', state => {
    const iframe = mountIframe('/live_chat?v=current-video')
    Object.defineProperty(iframe, 'contentDocument', {
      get: () => {
        if (state === 'inaccessible') throw new DOMException('Blocked frame access', 'SecurityError')
        if (state === 'inaccessible URL') {
          return {
            location: {
              get href() {
                throw new DOMException('Blocked document URL access', 'SecurityError')
              },
            },
          }
        }
        return null
      },
    })

    expect(isLiveChatIframe(iframe)).toBe(false)
    expect(isReplayChatIframe(iframe)).toBe(false)
    expect(collectPageObservation().targets.chatIframe).toBeNull()
    expect(getCurrentLiveChatIframe()).toBeNull()
  })

  it('classifies a trusted src while its accessible document is still blank', () => {
    const iframe = mountIframe('/live_chat?v=current-video', 'about:blank')

    expect(isLiveChatIframe(iframe)).toBe(true)
  })

  it('selects a valid chat iframe after a chat-like foreign iframe', () => {
    mountIframe('https://attacker.example/live_chat?v=current-video')
    const expected = mountIframe('/live_chat?v=current-video')

    expect(collectPageObservation().targets.nativeChatIframe).toBe(expected)
    expect(getCurrentLiveChatIframe()).toBe(expected)
  })

  it('does not reuse an observed replay marker after navigation to a non-chat URL', () => {
    const watch = document.createElement('ytd-watch-flexy')
    watch.setAttribute('video-id', 'current-video')
    document.body.appendChild(watch)
    const iframe = mountIframe('/live_chat_replay?v=current-video')
    markChatIframeObservedForCurrentVideo(iframe)
    expect(isReplayChatIframe(iframe)).toBe(true)

    iframe.src = 'https://attacker.example/live_chat_replay?v=current-video'

    expect(isReplayChatIframe(iframe)).toBe(false)
    expect(collectPageObservation().targets.chatIframe).toBeNull()
  })
})
