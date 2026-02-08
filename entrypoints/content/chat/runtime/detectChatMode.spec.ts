import { beforeEach, describe, expect, it } from 'vitest'
import { detectChatMode } from './detectChatMode'

const createWatchFlexy = (attrs: Record<string, string | null>) => {
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

const createMoviePlayer = ({ isLive, isLiveContent = isLive }: { isLive: boolean; isLiveContent?: boolean }) => {
  const moviePlayer = document.createElement('div') as HTMLElement & {
    getVideoData?: () => { isLive: boolean; isLiveContent: boolean }
  }
  moviePlayer.id = 'movie_player'
  moviePlayer.getVideoData = () => ({
    isLive,
    isLiveContent,
  })
  document.body.appendChild(moviePlayer)
}

const attachExtensionIframe = (options: { src: string; owned?: boolean; source?: string }) => {
  const host = document.createElement('div')
  host.id = 'shadow-root-live-chat'
  const shadowRoot = host.attachShadow({ mode: 'open' })
  const iframe = document.createElement('iframe')
  iframe.setAttribute('data-ylc-chat', 'true')
  iframe.src = options.src
  if (options.owned) iframe.setAttribute('data-ylc-owned', 'true')
  if (options.source) iframe.setAttribute('data-ylc-source', options.source)
  shadowRoot.appendChild(iframe)
  document.body.appendChild(host)
  return iframe
}

describe('detectChatMode', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('returns archive when extension has borrowed replay iframe', () => {
    attachExtensionIframe({
      src: 'https://www.youtube.com/live_chat_replay?v=archive-video',
      owned: false,
    })
    createWatchFlexy({ 'live-chat-present': null })

    expect(detectChatMode()).toBe('archive')
  })

  it('returns live when extension has managed live iframe', () => {
    attachExtensionIframe({
      src: 'https://www.youtube.com/live_chat?v=live-video',
      owned: true,
      source: 'live_direct',
    })

    expect(detectChatMode()).toBe('live')
  })

  it('returns archive on non-live page when only generic chat signals are present', () => {
    createWatchFlexy({ 'live-chat-present': null })
    createMoviePlayer({ isLive: false })

    expect(detectChatMode()).toBe('archive')
  })

  it('returns archive when chat signals exist even if video metadata still says live content', () => {
    createWatchFlexy({ 'live-chat-present': null })
    createMoviePlayer({ isLive: false, isLiveContent: true })

    expect(detectChatMode()).toBe('archive')
  })

  it('returns live when video is live even if native iframe is missing', () => {
    createWatchFlexy({ 'live-chat-present': null })
    createMoviePlayer({ isLive: true })

    expect(detectChatMode()).toBe('live')
  })

  it('returns none when no chat signals exist', () => {
    createMoviePlayer({ isLive: false })

    expect(detectChatMode()).toBe('none')
  })
})
