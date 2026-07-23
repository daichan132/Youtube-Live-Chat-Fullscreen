import { beforeEach, describe, expect, it } from 'vitest'
import { getCurrentYouTubeVideoId, getVideoIdFromUrl } from './getYouTubeVideoId'

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

const createChannelLiveSignals = (videoId: string) => {
  const moviePlayer = document.createElement('div') as HTMLElement & {
    getVideoData?: () => { video_id: string }
  }
  moviePlayer.id = 'movie_player'
  moviePlayer.getVideoData = () => ({ video_id: videoId })

  const watchFlexy = document.createElement('ytd-watch-flexy')
  watchFlexy.setAttribute('video-id', videoId)

  const chatHost = document.createElement('ytd-live-chat-frame')
  const iframe = document.createElement('iframe')
  iframe.id = 'chatframe'
  iframe.className = 'ytd-live-chat-frame'
  iframe.src = `https://www.youtube.com/live_chat?v=${videoId}`
  chatHost.appendChild(iframe)
  document.body.append(moviePlayer, watchFlexy, chatHost)

  return { iframe, moviePlayer, watchFlexy }
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
    createChannelLiveSignals('stale-dom-id')

    setLocation('/feed/subscriptions')

    expect(getCurrentYouTubeVideoId()).toBeNull()
  })

  it.each(['/@lofi/live', '/channel/UC123/live', '/c/lofi/live', '/user/lofi/live'])(
    'resolves matching current-page signals on channel live entry %s',
    path => {
      createChannelLiveSignals('channel-live-video')
      setLocation(path)

      expect(getCurrentYouTubeVideoId()).toBe('channel-live-video')
    },
  )

  it('keeps an explicit watch URL id authoritative over conflicting page signals', () => {
    createChannelLiveSignals('stale-dom-id')
    setLocation('/watch?v=url-video-id')

    expect(getCurrentYouTubeVideoId()).toBe('url-video-id')
  })

  it('returns null when channel live current-page signals conflict', () => {
    const { watchFlexy } = createChannelLiveSignals('video-a')
    watchFlexy.setAttribute('video-id', 'video-b')
    setLocation('/@lofi/live')

    expect(getCurrentYouTubeVideoId()).toBeNull()
  })

  it('tracks a video switch within the same channel live entry', () => {
    let playerVideoId = 'video-a'
    const { iframe, moviePlayer, watchFlexy } = createChannelLiveSignals(playerVideoId)
    moviePlayer.getVideoData = () => ({ video_id: playerVideoId })
    setLocation('/@lofi/live')

    expect(getCurrentYouTubeVideoId()).toBe('video-a')

    playerVideoId = 'video-b'
    watchFlexy.setAttribute('video-id', 'video-b')
    iframe.src = 'https://www.youtube.com/live_chat?v=video-b'

    expect(getCurrentYouTubeVideoId()).toBe('video-b')
  })

  it('ignores a stale extension-attached iframe when a channel live entry switches video', () => {
    let playerVideoId = 'video-a'
    const { iframe: borrowedIframe, moviePlayer, watchFlexy } = createChannelLiveSignals(playerVideoId)
    moviePlayer.getVideoData = () => ({ video_id: playerVideoId })
    borrowedIframe.setAttribute('data-ylc-chat', 'true')
    setLocation('/@lofi/live')

    expect(getCurrentYouTubeVideoId()).toBe('video-a')

    playerVideoId = 'video-b'
    watchFlexy.setAttribute('video-id', 'video-b')
    const nextHost = document.createElement('ytd-live-chat-frame')
    const nextIframe = document.createElement('iframe')
    nextIframe.className = 'ytd-live-chat-frame'
    nextIframe.src = 'https://www.youtube.com/live_chat?v=video-b'
    nextHost.appendChild(nextIframe)
    document.body.appendChild(nextHost)

    expect(getCurrentYouTubeVideoId()).toBe('video-b')
  })
})
