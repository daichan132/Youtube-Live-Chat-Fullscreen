import { beforeEach, describe, expect, it } from 'vitest'
import { getCurrentYouTubeVideoId, getVideoIdFromUrl } from './getYouTubeVideoId'

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

beforeEach(() => {
  document.body.innerHTML = ''
  setLocation('/watch?v=initial')
})

describe('getVideoIdFromUrl', () => {
  it('returns the v query parameter', () => {
    setLocation('/watch?v=urlVideo1')
    expect(getVideoIdFromUrl()).toBe('urlVideo1')
  })

  it('returns the /live/ path segment', () => {
    setLocation('/live/urlLive2')
    expect(getVideoIdFromUrl()).toBe('urlLive2')
  })

  it('returns null when URL has no video id', () => {
    setLocation('/channel/someChannel')
    expect(getVideoIdFromUrl()).toBeNull()
  })

  it('ignores DOM attributes and only reads the URL', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'domId')
    document.body.appendChild(watchFlexy)

    setLocation('/watch?v=urlId')
    expect(getVideoIdFromUrl()).toBe('urlId')
  })
})

describe('getCurrentYouTubeVideoId', () => {
  it('prefers URL id over stale DOM ids during SPA navigation', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'stale-dom-id')
    document.body.appendChild(watchFlexy)

    setLocation('/watch?v=current-url-id')

    expect(getCurrentYouTubeVideoId()).toBe('current-url-id')
  })

  it('does not fall back to stale DOM ids when the URL has no video id', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'stale-dom-id')
    document.body.appendChild(watchFlexy)

    setLocation('/feed/subscriptions')

    expect(getCurrentYouTubeVideoId()).toBeNull()
  })
})
