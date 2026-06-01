import { beforeEach, describe, expect, it } from 'vitest'
import { isYouTubeLiveNow } from './isYouTubeLiveNow'

const resetWindowPlayerResponse = () => {
  const target = window as Window & { ytInitialPlayerResponse?: unknown }
  target.ytInitialPlayerResponse = undefined
}

const currentUrlVideoId = () => new URL(window.location.href).searchParams.get('v') ?? ''

const createMoviePlayer = (isLive: boolean | undefined, videoId?: string) => {
  const moviePlayer = document.createElement('div') as HTMLElement & {
    getVideoData?: () => { isLive?: boolean; video_id?: string }
  }
  moviePlayer.id = 'movie_player'
  moviePlayer.getVideoData = () => ({ isLive, video_id: videoId })
  document.body.appendChild(moviePlayer)
  return moviePlayer
}

const createCurrentReplayButton = () => {
  const host = document.createElement('ytd-live-chat-frame')
  const iframe = document.createElement('iframe')
  iframe.src = `https://www.youtube.com/live_chat_replay?v=${currentUrlVideoId()}`
  const showHide = document.createElement('div')
  showHide.id = 'show-hide-button'
  const button = document.createElement('button')
  button.setAttribute('aria-label', 'Show chat replay')
  showHide.appendChild(button)
  host.appendChild(iframe)
  host.appendChild(showHide)
  document.body.appendChild(host)
  return button
}

beforeEach(() => {
  document.body.innerHTML = ''
  resetWindowPlayerResponse()
  const nonce = Math.random().toString(16).slice(2)
  window.history.pushState({}, '', `${window.location.origin}/watch?v=${nonce}`)
})

describe('isYouTubeLiveNow', () => {
  it('returns true when watch page has is-live-now attribute', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', currentUrlVideoId())
    watchFlexy.setAttribute('is-live-now', '')
    document.body.appendChild(watchFlexy)

    expect(isYouTubeLiveNow()).toBe(true)
  })

  it('ignores stale is-live-now attributes from another video', () => {
    window.history.pushState({}, '', `${window.location.origin}/watch?v=current-video`)
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'stale-video')
    watchFlexy.setAttribute('is-live-now', '')
    document.body.appendChild(watchFlexy)

    expect(isYouTubeLiveNow()).toBe(false)
  })

  it('returns false when only live-chat-present-and-expanded exists without live signals', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('live-chat-present-and-expanded', '')
    document.body.appendChild(watchFlexy)

    expect(isYouTubeLiveNow()).toBe(false)
  })

  it('returns true when player UI has ytp-live class', () => {
    createMoviePlayer(undefined, currentUrlVideoId())
    const timeDisplay = document.createElement('div')
    timeDisplay.className = 'ytp-time-display ytp-live'
    document.body.appendChild(timeDisplay)

    expect(isYouTubeLiveNow()).toBe(true)
  })

  it('returns false when movie player reports non-live even if player UI has ytp-live class', () => {
    createMoviePlayer(false)
    const timeDisplay = document.createElement('div')
    timeDisplay.className = 'ytp-time-display ytp-live'
    document.body.appendChild(timeDisplay)

    expect(isYouTubeLiveNow()).toBe(false)
  })

  it('returns false when archive replay button is present even if initial response says live', () => {
    createCurrentReplayButton()

    const target = window as Window & {
      ytInitialPlayerResponse?: {
        microformat?: {
          playerMicroformatRenderer?: {
            liveBroadcastDetails?: {
              isLiveNow?: boolean
            }
          }
        }
      }
    }
    target.ytInitialPlayerResponse = {
      microformat: {
        playerMicroformatRenderer: {
          liveBroadcastDetails: {
            isLiveNow: true,
          },
        },
      },
    }

    expect(isYouTubeLiveNow()).toBe(false)
  })

  it('ignores stale unscoped archive replay buttons when current movie player is live', () => {
    const showHide = document.createElement('div')
    showHide.id = 'show-hide-button'
    const button = document.createElement('button')
    button.setAttribute('aria-label', 'Show chat replay')
    showHide.appendChild(button)
    document.body.appendChild(showHide)
    createMoviePlayer(true, currentUrlVideoId())

    expect(isYouTubeLiveNow()).toBe(true)
  })

  it('detects current archive replay button even when a stale unscoped button appears first', () => {
    const showHide = document.createElement('div')
    showHide.id = 'show-hide-button'
    const staleButton = document.createElement('button')
    staleButton.setAttribute('aria-label', 'Show chat replay')
    showHide.appendChild(staleButton)
    document.body.appendChild(showHide)

    createCurrentReplayButton()

    const target = window as Window & {
      ytInitialPlayerResponse?: {
        microformat?: {
          playerMicroformatRenderer?: {
            liveBroadcastDetails?: {
              isLiveNow?: boolean
            }
          }
        }
      }
    }
    target.ytInitialPlayerResponse = {
      microformat: {
        playerMicroformatRenderer: {
          liveBroadcastDetails: {
            isLiveNow: true,
          },
        },
      },
    }

    expect(isYouTubeLiveNow()).toBe(false)
  })

  it('returns true when movie player reports live', () => {
    createMoviePlayer(true)

    expect(isYouTubeLiveNow()).toBe(true)
  })

  it('ignores stale movie player live data from another video', () => {
    window.history.pushState({}, '', `${window.location.origin}/watch?v=current-video`)
    createMoviePlayer(true, 'stale-video')

    expect(isYouTubeLiveNow()).toBe(false)
  })

  it('returns true when initial player response says live now', () => {
    const videoId = currentUrlVideoId()
    const target = window as Window & {
      ytInitialPlayerResponse?: {
        microformat?: {
          playerMicroformatRenderer?: {
            liveBroadcastDetails?: {
              isLiveNow?: boolean
            }
          }
        }
        videoDetails?: {
          videoId?: string
        }
      }
    }
    target.ytInitialPlayerResponse = {
      microformat: {
        playerMicroformatRenderer: {
          liveBroadcastDetails: {
            isLiveNow: true,
          },
        },
      },
      videoDetails: {
        videoId,
      },
    }

    expect(isYouTubeLiveNow()).toBe(true)
  })

  it('returns false when all live signals are absent', () => {
    createMoviePlayer(false)

    const target = window as Window & {
      ytInitialPlayerResponse?: {
        microformat?: {
          playerMicroformatRenderer?: {
            liveBroadcastDetails?: {
              isLiveNow?: boolean
            }
          }
        }
        videoDetails?: {
          isLive?: boolean
        }
      }
    }
    target.ytInitialPlayerResponse = {
      microformat: {
        playerMicroformatRenderer: {
          liveBroadcastDetails: {
            isLiveNow: false,
          },
        },
      },
      videoDetails: {
        isLive: false,
      },
    }

    expect(isYouTubeLiveNow()).toBe(false)
  })

  it('returns true from inline ytInitialPlayerResponse script fallback', () => {
    const videoId = currentUrlVideoId()
    const script = document.createElement('script')
    script.textContent = `var ytInitialPlayerResponse = {"videoDetails":{"videoId":"${videoId}"},"responseContext":{"serviceTrackingParams":[{"params":[{"key":"is_viewed_live","value":"True"}]}]},"microformat":{"playerMicroformatRenderer":{"liveBroadcastDetails":{"isLiveNow":true}}}};`
    document.head.appendChild(script)

    expect(isYouTubeLiveNow()).toBe(true)
  })

  it('ignores stale inline live script from another video', () => {
    window.history.pushState({}, '', `${window.location.origin}/watch?v=current-video`)
    const script = document.createElement('script')
    script.textContent =
      'var ytInitialPlayerResponse = {"videoDetails":{"videoId":"stale-video"},"microformat":{"playerMicroformatRenderer":{"liveBroadcastDetails":{"isLiveNow":true}}}};'
    document.head.appendChild(script)

    expect(isYouTubeLiveNow()).toBe(false)
  })

  it('ignores stale player UI live signal from another video', () => {
    window.history.pushState({}, '', `${window.location.origin}/watch?v=current-video`)
    const moviePlayer = createMoviePlayer(false, 'stale-video')
    moviePlayer.getVideoData = () => ({ video_id: 'stale-video' })
    const timeDisplay = document.createElement('div')
    timeDisplay.className = 'ytp-time-display ytp-live'
    document.body.appendChild(timeDisplay)

    expect(isYouTubeLiveNow()).toBe(false)
  })

  describe('SPA navigation stale chatframe', () => {
    it('ignores stale #chatframe replay when URL points to a different video', () => {
      // URL is now live video B
      window.history.pushState({}, '', `${window.location.origin}/watch?v=live-video-B`)

      // Stale #chatframe still referencing archive video A
      const chatFrame = document.createElement('iframe')
      chatFrame.id = 'chatframe'
      chatFrame.src = 'https://www.youtube.com/live_chat_replay?v=archive-video-A'
      document.body.appendChild(chatFrame)

      // Movie player says live
      createMoviePlayer(true)

      // Stale chatframe should be skipped, movie player live signal wins
      expect(isYouTubeLiveNow()).toBe(true)
    })

    it('still detects archive replay from #chatframe when video ID matches', () => {
      const videoId = 'same-video'
      window.history.pushState({}, '', `${window.location.origin}/watch?v=${videoId}`)

      const chatFrame = document.createElement('iframe')
      chatFrame.id = 'chatframe'
      chatFrame.src = `https://www.youtube.com/live_chat_replay?v=${videoId}`
      document.body.appendChild(chatFrame)

      expect(isYouTubeLiveNow()).toBe(false)
    })

    it('detects archive replay from YouTube live chat frame iframe class when video ID matches', () => {
      const videoId = 'same-video'
      window.history.pushState({}, '', `${window.location.origin}/watch?v=${videoId}`)

      const host = document.createElement('ytd-live-chat-frame')
      const iframe = document.createElement('iframe')
      iframe.className = 'ytd-live-chat-frame'
      iframe.src = `https://www.youtube.com/live_chat_replay?v=${videoId}`
      host.appendChild(iframe)
      document.body.appendChild(host)

      expect(isYouTubeLiveNow()).toBe(false)
    })
  })
})
