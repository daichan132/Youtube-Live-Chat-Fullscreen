import { beforeEach, describe, expect, it } from 'vitest'
import { detectChatMode } from './detectChatMode'

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

const createMoviePlayer = ({
  isLive,
  isLiveContent = isLive,
  videoId,
}: {
  isLive?: boolean
  isLiveContent?: boolean
  videoId?: string
}) => {
  const moviePlayer = document.createElement('div') as HTMLElement & {
    getVideoData?: () => { isLive?: boolean; isLiveContent?: boolean; video_id?: string }
  }
  moviePlayer.id = 'movie_player'
  moviePlayer.getVideoData = () => ({
    isLive,
    isLiveContent,
    video_id: videoId,
  })
  document.body.appendChild(moviePlayer)
  return moviePlayer
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
  const currentVideoId = new URL(window.location.href).searchParams.get('v')
  if (currentVideoId) liveChatFrame.setAttribute('data-ylc-observed-video-id', currentVideoId)
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
    setLocation('/watch?v=current-video')
  })

  it('returns archive when extension has borrowed replay iframe', () => {
    attachExtensionIframe({
      src: 'https://www.youtube.com/live_chat_replay?v=current-video',
      owned: false,
    })

    expect(detectChatMode()).toBe('archive')
  })

  it('returns live when extension has managed live iframe', () => {
    attachExtensionIframe({
      src: 'https://www.youtube.com/live_chat?v=current-video',
      owned: true,
      source: 'live_direct',
    })

    expect(detectChatMode()).toBe('live')
  })

  it('does not classify non-owned live chat iframe as borrowed archive', () => {
    attachExtensionIframe({
      src: 'https://www.youtube.com/live_chat?v=current-video',
      owned: false,
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

  it('returns live when stale native replay iframe exists but stream is live now', () => {
    const frame = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe')
    iframe.className = 'ytd-live-chat-frame'
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=stale-archive-video'
    frame.appendChild(iframe)
    document.body.appendChild(frame)

    const moviePlayer = createMoviePlayer({ isLive: true })
    moviePlayer.setAttribute('video-id', 'current-video')

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

  it('returns none when URL points to a new no-chat video and stale DOM still says live', () => {
    setLocation('/watch?v=current-no-chat-video')

    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'stale-live-video')
    watchFlexy.setAttribute('is-live-now', '')
    document.body.appendChild(watchFlexy)

    expect(detectChatMode()).toBe('none')
  })

  it('does not classify a continuation-only stale extension replay iframe as archive', () => {
    setLocation('/watch?v=current-no-chat-video')

    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'stale-archive-video')
    document.body.appendChild(watchFlexy)
    attachExtensionIframe({
      src: 'https://www.youtube.com/live_chat_replay?continuation=stale-archive-video',
      owned: false,
    })

    expect(detectChatMode()).toBe('none')
  })

  it('does not let stale movie player live metadata override no-chat URL through archive open control', () => {
    setLocation('/watch?v=current-no-chat-video')
    createMoviePlayer({ isLive: true, videoId: 'stale-live-video' })
    createArchiveOpenControl()

    expect(detectChatMode()).toBe('none')
  })

  it('does not classify a stale archive open control as archive after navigation', () => {
    setLocation('/watch?v=current-no-chat-video')
    const liveChatFrame = document.createElement('ytd-live-chat-frame')
    liveChatFrame.setAttribute('data-ylc-observed-video-id', 'stale-archive-video')
    const showHide = document.createElement('div')
    showHide.id = 'show-hide-button'
    const button = document.createElement('button')
    button.setAttribute('aria-label', 'Show chat')
    showHide.appendChild(button)
    liveChatFrame.appendChild(showHide)
    document.body.appendChild(liveChatFrame)
    createMoviePlayer({ isLive: false, videoId: 'current-no-chat-video' })

    expect(detectChatMode()).toBe('none')
  })

  describe('SPA navigation race condition', () => {
    it('rejects stale native replay iframe when URL points to a new video', () => {
      // Simulate: archive video A → live video B navigation.
      // URL updated to B, but DOM video-id still shows A.
      setLocation('/watch?v=live-video-B')

      const watchFlexy = document.createElement('ytd-watch-flexy')
      watchFlexy.setAttribute('video-id', 'archive-video-A')
      document.body.appendChild(watchFlexy)

      // Stale native replay iframe from video A
      const frame = document.createElement('ytd-live-chat-frame')
      const iframe = document.createElement('iframe')
      iframe.className = 'ytd-live-chat-frame'
      iframe.src = 'https://www.youtube.com/live_chat_replay?v=archive-video-A'
      frame.appendChild(iframe)
      document.body.appendChild(frame)

      const moviePlayer = createMoviePlayer({ isLive: true })
      moviePlayer.setAttribute('video-id', 'live-video-B')

      // URL-priority video ID (B) does not match iframe video ID (A),
      // so the stale iframe is skipped and isYouTubeLiveNow() returns live.
      expect(detectChatMode()).toBe('live')
    })

    it('rejects stale extension iframe when URL points to a new video', () => {
      setLocation('/watch?v=live-video-B')

      // Extension iframe still referencing old archive video A
      attachExtensionIframe({
        src: 'https://www.youtube.com/live_chat_replay?v=archive-video-A',
        owned: false,
      })

      createMoviePlayer({ isLive: true })

      // Extension iframe video ID (A) does not match URL video ID (B),
      // so the extension iframe is skipped and isYouTubeLiveNow() returns live.
      expect(detectChatMode()).toBe('live')
    })

    it('rejects stale #chatframe replay iframe when URL points to a new live video', () => {
      setLocation('/watch?v=live-video-B')

      // Stale native #chatframe from archive video A
      const chatFrame = document.createElement('iframe')
      chatFrame.id = 'chatframe'
      chatFrame.src = 'https://www.youtube.com/live_chat_replay?v=archive-video-A'
      document.body.appendChild(chatFrame)

      createMoviePlayer({ isLive: true })

      // #chatframe video ID (A) does not match URL video ID (B),
      // so hasArchiveReplaySignal() skips it and movie player live signal wins.
      expect(detectChatMode()).toBe('live')
    })
  })
})
