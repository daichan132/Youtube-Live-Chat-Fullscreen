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

    const videoId = (url: string) => {
      const parsed = new URL(url)
      expect(parsed.origin).toBe('https://www.youtube.com')
      expect(parsed.pathname).toBe('/watch')
      expect(parsed.searchParams.get('v')).toBeTruthy()
      return parsed.searchParams.get('v')
    }
    videoId(targets.archive.replayUrl)
    expect(videoId(targets.archive.transitionFromUrl)).not.toBe(videoId(targets.archive.transitionToUrl))
    videoId(targets.noChat.url)
    expect(targets.live.preferredUrl).toBeNull()
    expect(targets.liveSearch.urls.length).toBeGreaterThan(0)
    for (const url of targets.liveSearch.urls) {
      const search = new URL(url)
      expect(search.origin).toBe('https://www.youtube.com')
      expect(search.pathname).toBe('/results')
      expect(search.searchParams.get('search_query')?.trim()).toBeTruthy()
      expect(search.searchParams.get('sp')).toBe('EgJAAQ==')
    }
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
    unsetEnv('YLC_ARCHIVE_URL', 'YLC_ARCHIVE_NEXT_URL', 'YLC_NOCHAT_URL', 'YLC_LIVE_URL')
    const defaults = getE2ETestTargets()
    vi.stubEnv('YLC_ARCHIVE_URL', '   ')
    vi.stubEnv('YLC_ARCHIVE_NEXT_URL', '  ')
    vi.stubEnv('YLC_NOCHAT_URL', '')
    vi.stubEnv('YLC_LIVE_URL', ' ')

    expect(getE2ETestTargets()).toEqual(defaults)
  })
})
