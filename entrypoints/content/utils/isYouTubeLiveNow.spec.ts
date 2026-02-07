import { beforeEach, describe, expect, it } from 'vitest'
import { isYouTubeLiveNow } from './isYouTubeLiveNow'

const resetWindowPlayerResponse = () => {
  const target = window as Window & { ytInitialPlayerResponse?: unknown }
  target.ytInitialPlayerResponse = undefined
}

const createMoviePlayer = (isLive: boolean) => {
  const moviePlayer = document.createElement('div') as HTMLElement & {
    getVideoData?: () => { isLive: boolean }
  }
  moviePlayer.id = 'movie_player'
  moviePlayer.getVideoData = () => ({ isLive })
  document.body.appendChild(moviePlayer)
  return moviePlayer
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
    watchFlexy.setAttribute('is-live-now', '')
    document.body.appendChild(watchFlexy)

    expect(isYouTubeLiveNow()).toBe(true)
  })

  it('returns true when watch page has live-chat-present-and-expanded attribute', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('live-chat-present-and-expanded', '')
    document.body.appendChild(watchFlexy)

    expect(isYouTubeLiveNow()).toBe(true)
  })

  it('returns true when player UI has ytp-live class', () => {
    const timeDisplay = document.createElement('div')
    timeDisplay.className = 'ytp-time-display ytp-live'
    document.body.appendChild(timeDisplay)

    expect(isYouTubeLiveNow()).toBe(true)
  })

  it('returns true when movie player reports live', () => {
    createMoviePlayer(true)

    expect(isYouTubeLiveNow()).toBe(true)
  })

  it('returns true when initial player response says live now', () => {
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
    const script = document.createElement('script')
    script.textContent =
      'var ytInitialPlayerResponse = {"responseContext":{"serviceTrackingParams":[{"params":[{"key":"is_viewed_live","value":"True"}]}]},"microformat":{"playerMicroformatRenderer":{"liveBroadcastDetails":{"isLiveNow":true}}}};'
    document.head.appendChild(script)

    expect(isYouTubeLiveNow()).toBe(true)
  })
})
