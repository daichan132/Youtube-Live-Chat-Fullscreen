import { beforeEach, describe, expect, it } from 'vitest'
import { resolveChatSource } from './chatSourceResolver'

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

const createWatchFlexy = (attrs: Record<string, string | null> = {}) => {
  const watchFlexy = document.createElement('ytd-watch-flexy')
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null) {
      watchFlexy.setAttribute(key, '')
      continue
    }
    watchFlexy.setAttribute(key, value)
  }
  document.body.appendChild(watchFlexy)
  return watchFlexy
}

const createNativeChatIframe = (videoId: string) => {
  const frame = document.createElement('ytd-live-chat-frame')
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  iframe.id = 'chatframe'
  iframe.className = 'ytd-live-chat-frame'
  iframe.src = `https://www.youtube.com/live_chat?v=${videoId}`
  frame.appendChild(iframe)
  document.body.appendChild(frame)
  return iframe
}

const createMoviePlayer = (videoId: string, isLive: boolean) => {
  const moviePlayer = document.createElement('div') as HTMLElement & {
    getVideoData?: () => { isLive: boolean; video_id: string }
  }
  moviePlayer.id = 'movie_player'
  moviePlayer.getVideoData = () => ({
    isLive,
    video_id: videoId,
  })
  document.body.appendChild(moviePlayer)
  return moviePlayer
}

beforeEach(() => {
  document.body.innerHTML = ''
  setLocation('/watch?v=video-a')
})

describe('resolveChatSource', () => {
  it('returns live_direct when stream is live and video id is available', () => {
    createWatchFlexy({ 'is-live-now': null, 'video-id': 'video-live' })

    const source = resolveChatSource()
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('live_direct')
    if (source?.kind === 'live_direct') {
      expect(source.videoId).toBe('video-live')
      expect(source.url).toBe('https://www.youtube.com/live_chat?v=video-live')
    }
  })

  it('returns live_direct when movie player reports live without is-live-now attribute', () => {
    createWatchFlexy({ 'video-id': 'video-live' })
    createMoviePlayer('video-live', true)

    const source = resolveChatSource()
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('live_direct')
    if (source?.kind === 'live_direct') {
      expect(source.videoId).toBe('video-live')
      expect(source.url).toBe('https://www.youtube.com/live_chat?v=video-live')
    }
  })

  it('returns archive_native when native iframe matches current video', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    const iframe = createNativeChatIframe('video-a')

    const source = resolveChatSource()
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('archive_native')
    if (source?.kind === 'archive_native') {
      expect(source.iframe).toBe(iframe)
    }
  })

  it('returns null when native iframe video does not match current video', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    createNativeChatIframe('video-b')

    const source = resolveChatSource()
    expect(source).toBeNull()
  })

  it('returns null when no source is available', () => {
    const source = resolveChatSource()
    expect(source).toBeNull()
  })

  it('returns null when stream is live but video id is not ready', () => {
    setLocation('/watch')
    createWatchFlexy({ 'is-live-now': null })
    createNativeChatIframe('video-a')

    const source = resolveChatSource()
    expect(source).toBeNull()
  })
})
