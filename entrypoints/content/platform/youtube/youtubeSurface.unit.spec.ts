import { describe, expect, it } from 'vitest'
import { getYouTubeContentSurface, isYouTubeContentSurface } from './youtubeSurface'

describe('youtubeSurface', () => {
  it('recognizes watch, direct live, and channel live routes', () => {
    expect(getYouTubeContentSurface('https://www.youtube.com/watch?v=watch-video')).toEqual({
      route: 'watch',
      videoId: 'watch-video',
      activationKey: 'watch:watch-video',
    })
    expect(getYouTubeContentSurface('https://www.youtube.com/live/live-video')).toEqual({
      route: 'live',
      videoId: 'live-video',
      activationKey: 'live:live-video',
    })
    expect(getYouTubeContentSurface('https://www.youtube.com/@creator/live')).toEqual({
      route: 'live',
      videoId: null,
      activationKey: 'channel-live:/@creator/live',
    })
  })

  it('keeps different watch videos in different activation scopes', () => {
    expect(getYouTubeContentSurface('https://www.youtube.com/watch?v=video-a')?.activationKey).not.toBe(
      getYouTubeContentSurface('https://www.youtube.com/watch?v=video-b')?.activationKey,
    )
  })

  it.each(['/creator/live', '/creator/live/'])('recognizes legacy channel live entries at %s', path => {
    expect(getYouTubeContentSurface(`https://www.youtube.com${path}`)).toEqual({
      route: 'live',
      videoId: null,
      activationKey: 'channel-live:/creator/live',
    })
  })

  it.each(['feed', 'results', 'watch', 'shorts', 'embed', 'clip', 'playlist', 'channel', 'c', 'user', 'live_chat', 'live_chat_replay'])(
    'does not mistake the reserved %s route for a legacy channel',
    name => {
      expect(getYouTubeContentSurface(`https://www.youtube.com/${name}/live`)).toBeNull()
    },
  )

  it('accepts relative YouTube locations but rejects absolute non-YouTube origins', () => {
    expect(getYouTubeContentSurface('/watch?v=relative-video')).toMatchObject({
      route: 'watch',
      videoId: 'relative-video',
    })
    expect(getYouTubeContentSurface('https://example.com/watch?v=foreign-video')).toBeNull()
  })

  it('rejects unrelated and malformed routes', () => {
    expect(isYouTubeContentSurface('https://www.youtube.com/results?search_query=live')).toBe(false)
    expect(isYouTubeContentSurface('not a url')).toBe(false)
  })
})
