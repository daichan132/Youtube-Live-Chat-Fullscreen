import { describe, expect, it } from 'vitest'
import { compileYouTubeScenario } from './compiler'
import type { YouTubeScenarioState } from './types'

type LiveScenarioState = Extract<YouTubeScenarioState, { video: { mode: 'live' } }>
type ArchiveScenarioState = Extract<YouTubeScenarioState, { video: { mode: 'archive' } }>
type NoChatScenarioState = Extract<YouTubeScenarioState, { video: { mode: 'ordinary' } }>

const createLiveState = (overrides: Partial<LiveScenarioState> = {}): LiveScenarioState => ({
  video: { id: 'video-1', title: 'Typed fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: { mode: 'live', native: { state: 'absent' }, response: 'playable' },
  ...overrides,
})

const createArchiveState = (overrides: Partial<ArchiveScenarioState> = {}): ArchiveScenarioState => ({
  video: { id: 'archive-1', title: 'Archive fixture', mode: 'archive' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: { mode: 'archive', native: { state: 'playable' }, response: 'playable' },
  ...overrides,
})

const createNoChatState = (overrides: Partial<NoChatScenarioState> = {}): NoChatScenarioState => ({
  video: { id: 'ordinary-1', title: 'No chat fixture', mode: 'ordinary' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: { mode: 'none' },
  ...overrides,
})

const parseDocument = (html: string) => new DOMParser().parseFromString(html, 'text/html')

describe('YouTube scenario compiler', () => {
  it('compiles a live managed-source fixture without a native iframe', () => {
    const compiled = compileYouTubeScenario(createLiveState())

    expect(compiled.watchUrl).toBe('https://www.youtube.com/watch?v=video-1')
    const document = parseDocument(compiled.watchHtml)
    expect(document.querySelector('ytd-watch-flexy')?.hasAttribute('is-live-now')).toBe(true)
    expect(document.querySelector('iframe')).toBeNull()
    expect(compiled.spaDocument).toMatchObject({ title: 'Typed fixture', videoId: 'video-1', isLive: true })
    expect(parseDocument(compiled.spaDocument.bodyHtml).querySelector('#movie_player')?.getAttribute('data-ylc-fixture-generation')).toBe(
      '0',
    )
    expect(compiled.chatRoutes.map(route => route.pattern)).toEqual(['**/live_chat?*'])
    const chatDocument = parseDocument(compiled.chatRoutes[0]?.body ?? '')
    expect(chatDocument.querySelector('yt-live-chat-renderer > yt-live-chat-item-list-renderer')).not.toBeNull()
    expect(chatDocument.querySelector('yt-live-chat-unavailable-message-renderer')).toBeNull()
  })

  it('chooses the most specific live chat surface when fixture options overlap', () => {
    const surfaces = [
      { options: { standardPurchaseInteractions: true }, selector: '#fixture-messages' },
      { options: { purchaseInteractions: true }, selector: '#fixture-purchase-form' },
      { options: { appearanceSurfaces: true }, selector: '#fixture-closed-poll' },
      { options: { restrictedParticipation: true }, selector: 'yt-live-chat-restricted-participation-renderer' },
      { options: { giftButton: true }, selector: '#jewels-gifts-button' },
    ]
    for (let index = 0; index < surfaces.length; index += 1) {
      const options = Object.assign({}, ...surfaces.slice(index).map(surface => surface.options))
      const compiled = compileYouTubeScenario(
        createLiveState({ chat: { mode: 'live', native: { state: 'absent' }, response: 'playable', ...options } }),
      )
      const document = parseDocument(compiled.chatRoutes[0]?.body ?? '')
      expect(document.querySelector(surfaces[index]?.selector ?? '')).not.toBeNull()
      for (const lowerPriority of surfaces.slice(index + 1)) {
        expect(document.querySelector(lowerPriority.selector)).toBeNull()
      }
    }
  })

  it('preserves the exact native slot order for an archive borrow fixture', () => {
    const compiled = compileYouTubeScenario(
      createArchiveState({
        video: { id: 'archive-1', title: 'Archive <fixture> & "friends"', mode: 'archive' },
        chat: {
          mode: 'archive',
          native: {
            state: 'playable',
            showHideControl: true,
            slot: { beforeId: 'fixture-before', afterId: 'fixture-after' },
          },
          response: 'playable',
        },
      }),
    )

    const document = parseDocument(compiled.watchHtml)
    expect(document.title).toBe('Archive <fixture> & "friends"')
    const nativeHost = document.querySelector('ytd-live-chat-frame')
    expect(nativeHost?.getAttribute('video-id')).toBe('archive-1')
    expect(Array.from(nativeHost?.children ?? [], element => element.id)).toEqual([
      'fixture-before',
      'chatframe',
      'fixture-after',
      'show-hide-button',
    ])
    expect(nativeHost?.querySelector('#chatframe')?.tagName).toBe('IFRAME')
    expect(nativeHost?.querySelector('#show-hide-button button')?.textContent?.trim()).toBe('Show chat replay')
    expect(compiled.chatRoutes[0]?.pattern).toBe('**/live_chat_replay?*')
  })

  it('serves an unavailable native replay from the real chat route rather than srcdoc', () => {
    const compiled = compileYouTubeScenario(
      createArchiveState({
        video: { id: 'archive-unavailable', title: 'Unavailable fixture', mode: 'archive' },
        chat: {
          mode: 'archive',
          native: { state: 'unavailable', showHideControl: true, hostVideoId: false },
          response: 'unavailable',
        },
      }),
    )

    const document = parseDocument(compiled.watchHtml)
    const iframe = document.querySelector('ytd-live-chat-frame > iframe#chatframe')
    expect(iframe?.getAttribute('src')).toBe('/live_chat_replay?v=archive-unavailable&continuation=ylc-fixture&fixture-unavailable=1')
    expect(iframe?.hasAttribute('srcdoc')).toBe(false)
    expect(document.querySelector('ytd-live-chat-frame')?.hasAttribute('video-id')).toBe(false)
    const unavailable = compiled.chatRoutes.find(route => route.pattern === '**/live_chat_replay?*fixture-unavailable=1')
    expect(unavailable).toBeDefined()
    const chatDocument = parseDocument(unavailable?.body ?? '')
    expect(chatDocument.querySelector('yt-live-chat-unavailable-message-renderer')).not.toBeNull()
    expect(chatDocument.querySelector('yt-live-chat-item-list-renderer')).toBeNull()
  })

  it('compiles a no-chat fixture without chat routes or native iframe', () => {
    const compiled = compileYouTubeScenario(createNoChatState())

    for (const html of [compiled.watchHtml, compiled.spaDocument.bodyHtml]) {
      const document = parseDocument(html)
      expect(document.querySelector('ytd-watch-flexy')?.hasAttribute('is-live-now')).toBe(false)
      expect(document.querySelector('ytd-live-chat-frame, iframe')).toBeNull()
    }
    expect(compiled.chatRoutes).toEqual([])
  })

  it('compiles an opaque native continuation with an observable in-memory chat runtime', () => {
    const compiled = compileYouTubeScenario(
      createLiveState({
        chat: { mode: 'live', native: { state: 'playable', continuationVideoId: 'video-1' }, response: 'playable' },
      }),
    )
    const document = parseDocument(compiled.watchHtml)
    expect(document.querySelector('ytd-live-chat-frame > iframe#chatframe')?.getAttribute('src')).toBe(
      '/live_chat?continuation=ylc-fixture-video-1',
    )
    const chatDocument = parseDocument(compiled.chatRoutes[0]?.body ?? '')
    expect(chatDocument.body.dataset.ylcFixtureVideoId).toBe('video-1')
    const runtime: Record<string, unknown> = {}
    for (const script of chatDocument.scripts) new Function('window', script.textContent ?? '')(runtime)
    expect(runtime.__ylcFixtureChatRuntime).toEqual({ videoId: 'video-1' })
  })

  it('navigates a src-less native browsing context without declaring an iframe src', () => {
    const compiled = compileYouTubeScenario(
      createLiveState({
        chat: {
          mode: 'live',
          native: { state: 'playable', continuationVideoId: 'previous-video', navigateWithoutSrc: true },
          response: 'playable',
        },
      }),
    )
    const iframe = parseDocument(compiled.spaDocument.bodyHtml).querySelector('ytd-live-chat-frame > iframe#chatframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.hasAttribute('src')).toBe(false)
    expect(compiled.spaDocument.nativeChatNavigationHref).toBe('/live_chat?continuation=ylc-fixture-previous-video')
  })
})
