import { describe, expect, it } from 'vitest'
import { compileYouTubeScenario } from './compiler'
import type { YouTubeScenarioState } from './types'

const liveScenario = {
  video: { id: 'safe_fixture-ID_1', title: 'Safe fixture', mode: 'live' },
  page: { chatContainer: 'present' },
  fullscreen: false,
  chat: {
    mode: 'live',
    native: { state: 'absent' },
    response: 'playable',
  },
} satisfies YouTubeScenarioState

describe('YouTube scenario compiler safety', () => {
  it('accepts fixture-safe video IDs', () => {
    expect(compileYouTubeScenario(liveScenario).watchUrl).toBe('https://www.youtube.com/watch?v=safe_fixture-ID_1')
  })

  it.each(["unsafe'id", 'unsafe id', 'unsafe/id', ''])('rejects an unsafe video ID: %j', id => {
    expect(() =>
      compileYouTubeScenario({
        ...liveScenario,
        video: { ...liveScenario.video, id },
      }),
    ).toThrow('Invalid YouTube scenario video ID')
  })
})

// @ts-expect-error A live video cannot compile an archive chat fixture.
const mismatchedLiveScenario: YouTubeScenarioState = {
  ...liveScenario,
  chat: { mode: 'archive', native: { state: 'playable' }, response: 'playable' },
}
void mismatchedLiveScenario

// @ts-expect-error An ordinary video cannot compile a live chat fixture.
const mismatchedOrdinaryScenario: YouTubeScenarioState = {
  ...liveScenario,
  video: { ...liveScenario.video, mode: 'ordinary' },
}
void mismatchedOrdinaryScenario
