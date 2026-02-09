import { beforeEach, describe, expect, it } from 'vitest'
import { detectChatMode } from './detectChatMode'

const createMoviePlayer = ({ isLive, isLiveContent = isLive }: { isLive?: boolean; isLiveContent?: boolean }) => {
  const moviePlayer = document.createElement('div') as HTMLElement & {
    getVideoData?: () => { isLive?: boolean; isLiveContent?: boolean }
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

const createArchiveOpenControl = () => {
  const liveChatFrame = document.createElement('ytd-live-chat-frame')
  const showHide = document.createElement('div')
  showHide.id = 'show-hide-button'
  const button = document.createElement('button')
  button.setAttribute('aria-label', 'Show chat')
  showHide.appendChild(button)
  liveChatFrame.appendChild(showHide)
  document.body.appendChild(liveChatFrame)
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

  it('returns archive on non-live page when archive open control exists', () => {
    createMoviePlayer({ isLive: false })
    createArchiveOpenControl()

    expect(detectChatMode()).toBe('archive')
  })

  it('returns archive when open control exists even if metadata says live content', () => {
    createMoviePlayer({ isLive: false, isLiveContent: true })
    createArchiveOpenControl()

    expect(detectChatMode()).toBe('archive')
  })

  it('returns live when video is live now even if archive open control exists', () => {
    createMoviePlayer({ isLive: true })
    createArchiveOpenControl()

    expect(detectChatMode()).toBe('live')
  })

  it('returns live when metadata says live content and archive open control is missing', () => {
    createMoviePlayer({ isLiveContent: true })

    expect(detectChatMode()).toBe('live')
  })

  it('returns none when no archive open control and no live signals exist', () => {
    createMoviePlayer({ isLive: false })

    expect(detectChatMode()).toBe('none')
  })
})
