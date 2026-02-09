import { afterEach, describe, expect, it } from 'vitest'
import { getE2ETestTargets } from './testTargets'

const ORIGINAL_ENV = {
  YLC_ARCHIVE_URL: process.env.YLC_ARCHIVE_URL,
  YLC_ARCHIVE_NEXT_URL: process.env.YLC_ARCHIVE_NEXT_URL,
  YLC_REPLAY_UNAVAILABLE_URL: process.env.YLC_REPLAY_UNAVAILABLE_URL,
  YLC_NOCHAT_URL: process.env.YLC_NOCHAT_URL,
  YLC_LIVE_URL: process.env.YLC_LIVE_URL,
}

afterEach(() => {
  process.env.YLC_ARCHIVE_URL = ORIGINAL_ENV.YLC_ARCHIVE_URL
  process.env.YLC_ARCHIVE_NEXT_URL = ORIGINAL_ENV.YLC_ARCHIVE_NEXT_URL
  process.env.YLC_REPLAY_UNAVAILABLE_URL = ORIGINAL_ENV.YLC_REPLAY_UNAVAILABLE_URL
  process.env.YLC_NOCHAT_URL = ORIGINAL_ENV.YLC_NOCHAT_URL
  process.env.YLC_LIVE_URL = ORIGINAL_ENV.YLC_LIVE_URL
})

describe('getE2ETestTargets', () => {
  it('returns defaults when env overrides are missing', () => {
    delete process.env.YLC_ARCHIVE_URL
    delete process.env.YLC_ARCHIVE_NEXT_URL
    delete process.env.YLC_REPLAY_UNAVAILABLE_URL
    delete process.env.YLC_NOCHAT_URL
    delete process.env.YLC_LIVE_URL

    const targets = getE2ETestTargets()

    expect(targets.archive.replayUrl).toContain('/watch?v=')
    expect(targets.archive.transitionFromUrl).toContain('/watch?v=')
    expect(targets.archive.transitionToUrl).toContain('/watch?v=')
    expect(targets.replayUnavailable.url).toContain('/watch?v=')
    expect(targets.noChat.url).toContain('/watch?v=')
    expect(targets.live.preferredUrl).toBeNull()
    expect(targets.liveSearch.urls).toEqual(['https://www.youtube.com/results?search_query=vtuber&sp=EgJAAQ%253D%253D'])
  })

  it('uses existing YLC_* env overrides', () => {
    process.env.YLC_ARCHIVE_URL = 'https://example.com/archive'
    process.env.YLC_ARCHIVE_NEXT_URL = 'https://example.com/archive-next'
    process.env.YLC_REPLAY_UNAVAILABLE_URL = 'https://example.com/replay-unavailable'
    process.env.YLC_NOCHAT_URL = 'https://example.com/no-chat'
    process.env.YLC_LIVE_URL = 'https://example.com/live'

    const targets = getE2ETestTargets()

    expect(targets.archive.replayUrl).toBe('https://example.com/archive')
    expect(targets.archive.transitionFromUrl).toBe('https://example.com/archive')
    expect(targets.archive.transitionToUrl).toBe('https://example.com/archive-next')
    expect(targets.replayUnavailable.url).toBe('https://example.com/replay-unavailable')
    expect(targets.noChat.url).toBe('https://example.com/no-chat')
    expect(targets.live.preferredUrl).toBe('https://example.com/live')
  })

  it('treats blank env overrides as unset', () => {
    process.env.YLC_ARCHIVE_URL = '   '
    process.env.YLC_ARCHIVE_NEXT_URL = '  '
    process.env.YLC_REPLAY_UNAVAILABLE_URL = ''
    process.env.YLC_NOCHAT_URL = ''
    process.env.YLC_LIVE_URL = ' '

    const targets = getE2ETestTargets()

    expect(targets.archive.replayUrl).toContain('/watch?v=')
    expect(targets.archive.transitionToUrl).toContain('/watch?v=')
    expect(targets.replayUnavailable.url).toContain('/watch?v=')
    expect(targets.noChat.url).toContain('/watch?v=')
    expect(targets.live.preferredUrl).toBeNull()
  })
})
