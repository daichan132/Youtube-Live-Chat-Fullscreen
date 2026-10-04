import { beforeEach, describe, expect, it, vi } from 'vitest'
import { collectPageObservation } from '@/entrypoints/content/platform/youtube/collectPageObservation'
import {
  getIframeVideoId,
  isChatHostForCurrentVideo,
  isReplayChatIframe,
  markChatIframeObservedForCurrentVideo,
  YLC_CHAT_ATTR,
  YLC_OBSERVED_VIDEO_ATTR,
  YLC_OWNED_ATTR,
} from './iframeDom'

const oldId = 'previous-video'
const nextId = 'next-video'
const chatHref = (token: string, mode: 'archive' | 'live' = 'archive') =>
  `https://www.youtube.com/${mode === 'archive' ? 'live_chat_replay' : 'live_chat'}?continuation=${token}`

const createChatDocument = (href: string | (() => string), referrer: string | (() => string) = window.location.href) => {
  const doc = document.implementation.createHTMLDocument('')
  doc.body.innerHTML = '<yt-live-chat-renderer><yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer></yt-live-chat-renderer>'
  return new Proxy(doc, {
    get(target, key) {
      if (key === 'location') return { href: typeof href === 'function' ? href() : href }
      if (key === 'referrer') return typeof referrer === 'function' ? referrer() : referrer
      if (key === 'readyState') return 'complete'
      const value = Reflect.get(target, key, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

const setupReusedIframe = () => {
  window.history.replaceState({}, '', `/watch?v=${oldId}`)
  const watch = document.createElement('ytd-watch-flexy')
  watch.setAttribute('video-id', oldId)
  const player = document.createElement('div')
  player.id = 'movie_player'
  // Actual Chrome's isolated content world cannot access getVideoData, so the
  // containing watch surface remains the authoritative available DOM identity.
  const host = document.createElement('ytd-live-chat-frame')
  const iframe = document.createElement('iframe')
  iframe.id = 'chatframe'
  iframe.src = chatHref('previous')
  let chatDocument = createChatDocument(chatHref('previous-document'))
  Object.defineProperty(iframe, 'contentDocument', { configurable: true, get: () => chatDocument })
  host.append(iframe)
  watch.append(player, host)
  document.body.append(watch)
  markChatIframeObservedForCurrentVideo(iframe, oldId)
  const nextPage = () => {
    window.history.replaceState({}, '', `/watch?v=${nextId}`)
    watch.setAttribute('video-id', nextId)
  }
  const reload = (href = chatHref('next-document'), referrer = window.location.href) => {
    chatDocument = createChatDocument(href, referrer)
  }
  return { watch, player, host, iframe, nextPage, reload }
}

beforeEach(() => document.body.replaceChildren())

describe('native chat iframe reuse after SPA navigation', () => {
  it('avoids repeated source and referrer parsing for an unchanged native document', () => {
    const { iframe } = setupReusedIframe()
    const parse = vi.spyOn(globalThis, 'URL')
    try {
      for (let index = 0; index < 100; index++) markChatIframeObservedForCurrentVideo(iframe, oldId)

      // Declared-video lookups remain live; the source/referrer metadata is reused.
      expect(parse).toHaveBeenCalledTimes(200)
      expect(parse.mock.calls.some(([href]) => href === `https://www.youtube.com/watch?v=${oldId}`)).toBe(false)
    } finally {
      parse.mockRestore()
    }
  })

  it('reassigns a connected native iframe only after its source and loaded document change for the current watch surface', () => {
    const { iframe, host, nextPage, reload } = setupReusedIframe()
    nextPage()
    iframe.src = chatHref('next')
    reload()

    const observation = collectPageObservation()

    expect(getIframeVideoId(iframe)).toBe(nextId)
    expect(host.getAttribute(YLC_OBSERVED_VIDEO_ATTR)).toBe(nextId)
    expect(isChatHostForCurrentVideo(host)).toBe(true)
    expect(observation.evidence).toMatchObject({ sourceKind: 'native-replay', videoMode: 'archive', chatAvailability: 'ready' })
    expect(observation.targets.chatIframe).toBe(iframe)
  })

  it('does not attribute a new src to the next video while the previous document remains loaded', () => {
    const { iframe, nextPage } = setupReusedIframe()
    nextPage()
    iframe.src = chatHref('next')

    collectPageObservation()

    expect(getIframeVideoId(iframe)).toBe(oldId)
  })

  it('rejects the previous continuation document when only src explicitly names the next video', () => {
    const { iframe, nextPage } = setupReusedIframe()
    nextPage()
    iframe.src = `${chatHref('next')}&v=${nextId}`

    const observation = collectPageObservation()

    expect(iframe.getAttribute(YLC_OBSERVED_VIDEO_ATTR)).toBe(oldId)
    expect(observation.targets.chatIframe).toBe(null)
    expect(observation.evidence.sourceKind).toBe(null)
    expect(observation.evidence.capabilities.canBorrowNativeChat).toBe(false)
  })

  it('accepts a new document with current-watch referrer when YouTube retains the original iframe src', () => {
    const { iframe, nextPage, reload } = setupReusedIframe()
    nextPage()
    reload()

    collectPageObservation()

    expect(getIframeVideoId(iframe)).toBe(nextId)
  })

  it.each(['/@lofi/live', '/channel/channel-id/live', '/c/lofi/live', '/user/lofi/live'])(
    'accepts a reused native iframe with explicit current document identity on %s',
    route => {
      const { iframe, host, nextPage, reload } = setupReusedIframe()
      nextPage()
      window.history.replaceState({}, '', route)
      iframe.src = `${chatHref('next', 'live')}&v=${nextId}`
      reload(`${chatHref('next-document', 'live')}&v=${nextId}`)

      const observation = collectPageObservation()

      expect(getIframeVideoId(iframe)).toBe(nextId)
      expect(host.getAttribute(YLC_OBSERVED_VIDEO_ATTR)).toBe(nextId)
      expect(observation.targets.chatIframe).toBe(iframe)
      expect(observation.evidence.sourceKind).toBe('native-live')
      expect(observation.evidence.capabilities.canBorrowNativeChat).toBe(true)
    },
  )

  it('does not infer a new continuation-only document identity from a channel live referrer', () => {
    const { iframe, nextPage, reload } = setupReusedIframe()
    nextPage()
    window.history.replaceState({}, '', '/@lofi/live')
    iframe.src = chatHref('next')
    reload()

    const observation = collectPageObservation()

    expect(iframe.getAttribute(YLC_OBSERVED_VIDEO_ATTR)).toBe(oldId)
    expect(observation.targets.chatIframe).toBe(null)
    expect(observation.evidence.capabilities.canBorrowNativeChat).toBe(false)
  })

  it('rechecks an updated referrer on the same newly loaded document', () => {
    const { iframe, nextPage } = setupReusedIframe()
    nextPage()
    let referrer = `https://www.youtube.com/watch?v=${oldId}`
    const chatDocument = createChatDocument(chatHref('next-document'), () => referrer)
    Object.defineProperty(iframe, 'contentDocument', { configurable: true, get: () => chatDocument })
    collectPageObservation()
    expect(getIframeVideoId(iframe)).toBe(oldId)

    referrer = window.location.href
    collectPageObservation()

    expect(getIframeVideoId(iframe)).toBe(nextId)
  })

  it('rechecks an updated src while the newly loaded document remains the same', () => {
    const { iframe, nextPage, reload } = setupReusedIframe()
    nextPage()
    reload()
    iframe.src = `${chatHref('previous')}&v=${oldId}`
    collectPageObservation()
    expect(getIframeVideoId(iframe)).toBe(oldId)

    iframe.src = `${chatHref('next')}&v=${nextId}`
    collectPageObservation()

    expect(iframe.getAttribute(YLC_OBSERVED_VIDEO_ATTR)).toBe(nextId)
  })

  it('rechecks a document URL changed without replacing the document', () => {
    const { iframe } = setupReusedIframe()
    let href = chatHref('previous-document')
    const chatDocument = createChatDocument(() => href)
    Object.defineProperty(iframe, 'contentDocument', { configurable: true, get: () => chatDocument })
    collectPageObservation()
    expect(isReplayChatIframe(iframe)).toBe(true)

    href = chatHref('previous-document', 'live')
    collectPageObservation()

    expect(isReplayChatIframe(iframe)).toBe(false)
    expect(iframe.hasAttribute('data-ylc-observed-chat-mode')).toBe(false)
  })

  it('rejects a completed intermediate document when the parent has already navigated to another video', () => {
    const { iframe, watch, nextPage, reload } = setupReusedIframe()
    window.history.replaceState({}, '', '/watch?v=intermediate-video')
    watch.setAttribute('video-id', 'intermediate-video')
    iframe.src = chatHref('intermediate')
    reload(chatHref('intermediate-document'))
    nextPage()
    iframe.src = chatHref('next')

    collectPageObservation()

    expect(getIframeVideoId(iframe)).toBe(oldId)
  })

  it('does not reassign a reload of the old continuation even when its player offset changes', () => {
    const { iframe, nextPage, reload } = setupReusedIframe()
    nextPage()
    iframe.src = `${chatHref('previous')}&playerOffsetMs=120000`
    reload(`${chatHref('previous-document')}&playerOffsetMs=120000`)

    collectPageObservation()

    expect(getIframeVideoId(iframe)).toBe(oldId)
  })

  it('does not mistake a reload already observed on the previous video for a new navigation source', () => {
    const { iframe, nextPage, reload } = setupReusedIframe()
    iframe.src = chatHref('previous-reloaded')
    reload(chatHref('previous-document-reloaded'))
    collectPageObservation()
    nextPage()

    collectPageObservation()

    expect(getIframeVideoId(iframe)).toBe(oldId)
  })

  it('does not assign a blank replacement in an old observed host to a newly navigated page', () => {
    const { iframe, host, nextPage } = setupReusedIframe()
    const replacement = document.createElement('iframe')
    replacement.id = 'chatframe'
    iframe.replaceWith(replacement)
    nextPage()

    collectPageObservation()

    expect(replacement.hasAttribute(YLC_OBSERVED_VIDEO_ATTR)).toBe(false)
    expect(getIframeVideoId(replacement)).toBe(oldId)
    const staleDocument = createChatDocument(chatHref('previous-late-document'), `https://www.youtube.com/watch?v=${oldId}`)
    Object.defineProperty(replacement, 'contentDocument', {
      configurable: true,
      get: () => staleDocument,
    })

    const observation = collectPageObservation()

    expect(getIframeVideoId(replacement)).toBe(oldId)
    expect(host.getAttribute(YLC_OBSERVED_VIDEO_ATTR)).toBe(oldId)
    expect(observation.evidence.capabilities.canBorrowNativeChat).toBe(false)
    expect(observation.targets.chatIframe).toBe(null)
  })

  it('retains the same-video replay fallback for a blank replacement', () => {
    const { iframe, host } = setupReusedIframe()
    const replacement = document.createElement('iframe')
    replacement.id = 'chatframe'
    iframe.replaceWith(replacement)

    collectPageObservation()

    expect(getIframeVideoId(replacement)).toBe(oldId)
    expect(host.getAttribute(YLC_OBSERVED_VIDEO_ATTR)).toBe(oldId)
    expect(isReplayChatIframe(replacement)).toBe(true)
    const replacementDocument = createChatDocument(chatHref('previous-replacement'))
    Object.defineProperty(replacement, 'contentDocument', {
      configurable: true,
      get: () => replacementDocument,
    })

    expect(collectPageObservation().evidence.capabilities.canBorrowNativeChat).toBe(true)
  })

  it.each([`/watch?v=${nextId}`, '/@lofi/live'])('accepts a fresh explicit current document on %s in the current native host', route => {
    const { iframe, host, nextPage } = setupReusedIframe()
    const replacement = document.createElement('iframe')
    replacement.id = 'chatframe'
    iframe.replaceWith(replacement)
    nextPage()
    window.history.replaceState({}, '', route)
    const replacementDocument = createChatDocument(`${chatHref('next-replacement')}&v=${nextId}`)
    Object.defineProperty(replacement, 'contentDocument', { configurable: true, get: () => replacementDocument })

    const observation = collectPageObservation()

    expect(getIframeVideoId(replacement)).toBe(nextId)
    expect(replacement.getAttribute(YLC_OBSERVED_VIDEO_ATTR)).toBe(nextId)
    expect(host.getAttribute(YLC_OBSERVED_VIDEO_ATTR)).toBe(nextId)
    expect(observation.evidence.capabilities.canBorrowNativeChat).toBe(true)
    expect(observation.targets.chatIframe).toBe(replacement)
  })

  it.each(['continuation-only', 'stale-referrer', 'cross-origin-referrer', 'blank-referrer', 'conflicting-src', 'borrowed'] as const)(
    'does not relabel an old host from a fresh %s replacement',
    condition => {
      const { iframe, host, nextPage } = setupReusedIframe()
      const replacement = document.createElement('iframe')
      replacement.id = 'chatframe'
      iframe.replaceWith(replacement)
      nextPage()
      const href = condition === 'continuation-only' ? chatHref('next-replacement') : `${chatHref('next-replacement')}&v=${nextId}`
      const referrer =
        condition === 'stale-referrer'
          ? `https://www.youtube.com/watch?v=${oldId}`
          : condition === 'cross-origin-referrer'
            ? `https://example.com/watch?v=${nextId}`
            : condition === 'blank-referrer'
              ? 'about:blank'
              : window.location.href
      const replacementDocument = createChatDocument(href, referrer)
      Object.defineProperty(replacement, 'contentDocument', { configurable: true, get: () => replacementDocument })
      if (condition === 'conflicting-src') replacement.src = `${chatHref('previous')}&v=${oldId}`
      if (condition === 'borrowed') replacement.setAttribute(YLC_CHAT_ATTR, 'true')

      const observation = collectPageObservation()

      expect(replacement.hasAttribute(YLC_OBSERVED_VIDEO_ATTR)).toBe(false)
      expect(host.getAttribute(YLC_OBSERVED_VIDEO_ATTR)).toBe(oldId)
      expect(observation.targets.chatIframe).toBe(null)
      expect(observation.evidence.sourceKind).toBe(null)
      expect(observation.evidence.capabilities.canBorrowNativeChat).toBe(false)
    },
  )

  it.each([
    'detached',
    'borrowed',
    'managed',
    'replaced-host',
    'stale-watch',
    'conflicting-player',
    'conflicting-src',
    'conflicting-document',
    'stale-referrer',
    'cross-origin-referrer',
  ] as const)('retains the previous identity for %s sources', condition => {
    const { iframe, watch, player, nextPage, reload } = setupReusedIframe()
    nextPage()
    iframe.src = chatHref('next')
    reload()
    if (condition === 'detached') iframe.remove()
    else if (condition === 'borrowed') iframe.setAttribute(YLC_CHAT_ATTR, 'true')
    else if (condition === 'managed') iframe.setAttribute(YLC_OWNED_ATTR, 'true')
    else if (condition === 'replaced-host') {
      const nextHost = document.createElement('ytd-live-chat-frame')
      iframe.parentElement?.replaceWith(nextHost)
      nextHost.append(iframe)
    } else if (condition === 'stale-watch') watch.setAttribute('video-id', oldId)
    else if (condition === 'conflicting-player') player.setAttribute('video-id', oldId)
    else if (condition === 'conflicting-src') {
      iframe.src = `${chatHref('next')}&v=${oldId}`
      reload(`${chatHref('next-document')}&v=${nextId}`)
    } else if (condition === 'conflicting-document') {
      iframe.setAttribute('video-id', nextId)
      reload(`${chatHref('next-document')}&v=${oldId}`)
    } else if (condition === 'stale-referrer') reload(chatHref('next-document'), `https://www.youtube.com/watch?v=${oldId}`)
    else reload(chatHref('next-document'), `https://example.com/watch?v=${nextId}`)

    const observation = collectPageObservation()

    expect(iframe.getAttribute(YLC_OBSERVED_VIDEO_ATTR)).toBe(oldId)
    expect(observation.targets.chatIframe).toBe(null)
    expect(observation.evidence.sourceKind).toBe(null)
    expect(observation.evidence.capabilities.canBorrowNativeChat).toBe(false)
  })

  it.each([true, false])('clears previous archive mode for a loaded live source (src changed: %s)', changeSrc => {
    const { iframe, host, nextPage, reload } = setupReusedIframe()
    nextPage()
    if (changeSrc) iframe.src = chatHref('next', 'live')
    reload(chatHref('next-document', 'live'))

    const observation = collectPageObservation()

    expect(getIframeVideoId(iframe)).toBe(nextId)
    expect(isReplayChatIframe(iframe)).toBe(false)
    expect(iframe.hasAttribute('data-ylc-observed-chat-mode')).toBe(false)
    expect(host.hasAttribute('data-ylc-observed-chat-mode')).toBe(false)
    expect(observation.evidence).toMatchObject({ sourceKind: 'native-live', videoMode: 'live' })
  })
})
