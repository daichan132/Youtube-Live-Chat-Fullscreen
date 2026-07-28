import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compileYouTubeScenario } from './compiler'
import type { YouTubeScenarioState } from './types'
import { YouTubeScenario } from './YouTubeScenario'

type LiveScenarioState = Extract<YouTubeScenarioState, { video: { mode: 'live' } }>
type ArchiveScenarioState = Extract<YouTubeScenarioState, { video: { mode: 'archive' } }>
type NoChatScenarioState = Extract<YouTubeScenarioState, { video: { mode: 'ordinary' } }>

const createLiveState = (overrides: Partial<LiveScenarioState> = {}): LiveScenarioState => ({
  video: { id: 'video-1', title: 'Typed fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'live',
    native: { state: 'absent' },
    response: 'playable',
  },
  ...overrides,
})

const createArchiveState = (overrides: Partial<ArchiveScenarioState> = {}): ArchiveScenarioState => ({
  video: { id: 'archive-1', title: 'Archive fixture', mode: 'archive' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'archive',
    native: { state: 'playable' },
    response: 'playable',
  },
  ...overrides,
})

const createNoChatState = (overrides: Partial<NoChatScenarioState> = {}): NoChatScenarioState => ({
  video: { id: 'ordinary-1', title: 'No chat fixture', mode: 'ordinary' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: { mode: 'none' },
  ...overrides,
})

describe('YouTube scenario compiler', () => {
  it('exposes the bounded fixture lifecycle and mutation API', () => {
    expect(Object.getOwnPropertyNames(YouTubeScenario.prototype)).toEqual(
      expect.arrayContaining([
        'load',
        'enterFullscreen',
        'exitFullscreen',
        'addNativeIframe',
        'replaceNativeIframe',
        'setChatUnavailable',
        'addNativeChatControl',
        'observeExtensionIframeIdentity',
        'observeNativeSlot',
        'observeRuntime',
      ]),
    )
  })

  it('compiles a live managed-source fixture without a native iframe', () => {
    const compiled = compileYouTubeScenario(createLiveState())

    expect(compiled.watchUrl).toBe('https://www.youtube.com/watch?v=video-1')
    expect(compiled.watchHtml).toContain('is-live-now')
    expect(compiled.watchHtml).not.toContain('id="chatframe"')
    expect(compiled.chatRoutes).toEqual([
      expect.objectContaining({
        pattern: '**/live_chat?*',
        body: expect.stringContaining('yt-live-chat-item-list-renderer'),
      }),
    ])
  })

  it('preserves the exact native slot order for an archive borrow fixture', () => {
    const compiled = compileYouTubeScenario(
      createArchiveState({
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

    const before = compiled.watchHtml.indexOf('id="fixture-before"')
    const iframe = compiled.watchHtml.indexOf('id="chatframe"')
    const after = compiled.watchHtml.indexOf('id="fixture-after"')
    const control = compiled.watchHtml.indexOf('id="show-hide-button"')
    expect(before).toBeGreaterThan(-1)
    expect(before).toBeLessThan(iframe)
    expect(iframe).toBeLessThan(after)
    expect(after).toBeLessThan(control)
    expect(compiled.chatRoutes[0]?.pattern).toBe('**/live_chat_replay?*')
  })

  it('renders an unavailable native replay marker and response', () => {
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

    expect(compiled.watchHtml).toContain('yt-live-chat-unavailable-message-renderer')
    expect(compiled.chatRoutes[0]?.body).toContain('yt-live-chat-unavailable-message-renderer')
  })

  it('compiles a no-chat fixture without chat routes or native iframe', () => {
    const compiled = compileYouTubeScenario(
      createNoChatState(),
    )

    expect(compiled.watchHtml).not.toContain('is-live-now')
    expect(compiled.watchHtml).not.toContain('id="chatframe"')
    expect(compiled.chatRoutes).toEqual([])
  })

  it('keeps raw fixture DOM, routing, and mutation knowledge out of deterministic specs', () => {
    const scenarioRoot = fileURLToPath(new URL('../../scenarios', import.meta.url))
    const fixtureSpecs = [
      'archive/borrowRestore.fixture.spec.ts',
      'archive/replayUnavailable.fixture.spec.ts',
      'live/managedNativeHandoff.fixture.spec.ts',
      'live/noChatVideo.fixture.spec.ts',
    ]

    for (const relativePath of fixtureSpecs) {
      const source = fs.readFileSync(`${scenarioRoot}/${relativePath}`, 'utf8')
      expect(source).toContain('YouTubeScenario')
      expect(source).not.toMatch(/\bpage\s*(?:\.|\?\.)\s*[A-Za-z_$][\w$]*\s*\(/)
      expect(source).not.toContain('<!doctype')
      expect(source).not.toContain('buildWatchFixtureHtml')
      expect(source).not.toContain('routeYouTubeWatchFixture')
    }
  })
})
