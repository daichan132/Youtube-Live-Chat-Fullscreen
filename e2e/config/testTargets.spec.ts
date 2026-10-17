import { afterEach, describe, expect, it, vi } from 'vitest'
import { getE2ETestTargets } from './testTargets'

const unsetEnv = (...keys: string[]) => {
  for (const key of keys) vi.stubEnv(key, undefined)
}

afterEach(() => vi.unstubAllEnvs())

describe('getE2ETestTargets', () => {
  it('returns defaults when env overrides are missing', () => {
    unsetEnv('YLC_ARCHIVE_URL', 'YLC_ARCHIVE_NEXT_URL', 'YLC_NOCHAT_URL', 'YLC_LIVE_URL')

    const targets = getE2ETestTargets()

    expect(targets.archive.replayUrl).toContain('/watch?v=')
    expect(targets.archive.transitionFromUrl).toContain('/watch?v=')
    expect(targets.archive.transitionToUrl).toContain('/watch?v=')
    expect(targets.noChat.url).toContain('/watch?v=')
    expect(targets.live.preferredUrl).toBeNull()
    expect(targets.liveSearch.urls).toEqual([
      'https://www.youtube.com/results?search_query=vtuber&sp=EgJAAQ%3D%3D',
      'https://www.youtube.com/results?search_query=%E3%82%B2%E3%83%BC%E3%83%A0%E9%85%8D%E4%BF%A1&sp=EgJAAQ%3D%3D',
      'https://www.youtube.com/results?search_query=live+stream+chat&sp=EgJAAQ%3D%3D',
    ])
    expect(targets.liveSearch.urls.every(url => new URL(url).searchParams.get('sp') === 'EgJAAQ==')).toBe(true)
  })

  it('uses existing YLC_* env overrides', () => {
    vi.stubEnv('YLC_ARCHIVE_URL', 'https://example.com/archive')
    vi.stubEnv('YLC_ARCHIVE_NEXT_URL', 'https://example.com/archive-next')
    vi.stubEnv('YLC_NOCHAT_URL', 'https://example.com/no-chat')
    vi.stubEnv('YLC_LIVE_URL', 'https://example.com/live')

    const targets = getE2ETestTargets()

    expect(targets.archive.replayUrl).toBe('https://example.com/archive')
    expect(targets.archive.transitionFromUrl).toBe('https://example.com/archive')
    expect(targets.archive.transitionToUrl).toBe('https://example.com/archive-next')
    expect(targets.noChat.url).toBe('https://example.com/no-chat')
    expect(targets.live.preferredUrl).toBe('https://example.com/live')
  })

  it('treats blank env overrides as unset', () => {
    vi.stubEnv('YLC_ARCHIVE_URL', '   ')
    vi.stubEnv('YLC_ARCHIVE_NEXT_URL', '  ')
    vi.stubEnv('YLC_NOCHAT_URL', '')
    vi.stubEnv('YLC_LIVE_URL', ' ')

    const targets = getE2ETestTargets()

    expect(targets.archive.replayUrl).toContain('/watch?v=')
    expect(targets.archive.transitionToUrl).toContain('/watch?v=')
    expect(targets.noChat.url).toContain('/watch?v=')
    expect(targets.live.preferredUrl).toBeNull()
  })
})
