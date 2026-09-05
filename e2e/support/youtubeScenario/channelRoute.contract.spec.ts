import { describe, expect, it } from 'vitest'
import { compileYouTubeScenario } from './compiler'
import type { YouTubeScenarioState } from './types'

const createLiveState = (route: NonNullable<YouTubeScenarioState['page']['route']>): YouTubeScenarioState => ({
  video: { id: 'ylc-channel-live', title: 'Channel live fixture', mode: 'live' },
  page: { chatContainer: 'present', route },
  fullscreen: false,
  chat: {
    mode: 'live',
    native: { state: 'absent' },
    response: 'playable',
  },
})

describe('YouTube scenario route compilation', () => {
  it('compiles watch, direct-live, and channel-live entry URLs', () => {
    expect(compileYouTubeScenario(createLiveState('watch')).watchUrl).toBe(
      'https://www.youtube.com/watch?v=ylc-channel-live',
    )
    expect(compileYouTubeScenario(createLiveState('direct-live')).watchUrl).toBe(
      'https://www.youtube.com/live/ylc-channel-live',
    )
    expect(compileYouTubeScenario(createLiveState('channel-live')).watchUrl).toBe(
      'https://www.youtube.com/@ylc-fixture/live',
    )
  })

  it('rejects live-only entry routes for archived videos', () => {
    const archive: YouTubeScenarioState = {
      video: { id: 'ylc-archive', title: 'Archive fixture', mode: 'archive' },
      page: { chatContainer: 'present', route: 'channel-live' },
      fullscreen: false,
      chat: {
        mode: 'archive',
        native: { state: 'playable' },
        response: 'playable',
      },
    }

    expect(() => compileYouTubeScenario(archive)).toThrow('requires a live video')
  })
})
