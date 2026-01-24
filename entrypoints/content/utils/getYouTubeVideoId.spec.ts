import { beforeEach, describe, expect, it } from 'vitest'
import { getYouTubeVideoId } from './getYouTubeVideoId'

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

beforeEach(() => {
  document.body.innerHTML = ''
  setLocation('/watch?v=initial')
})

describe('getYouTubeVideoId', () => {
  it('prefers the ytd-watch-flexy video-id attribute', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'flexy123')
    document.body.appendChild(watchFlexy)

    const moviePlayer = document.createElement('div')
    moviePlayer.id = 'movie_player'
    moviePlayer.setAttribute('video-id', 'player456')
    document.body.appendChild(moviePlayer)

    expect(getYouTubeVideoId()).toBe('flexy123')
  })

  it('falls back to movie player attributes and video data', () => {
    const moviePlayer = document.createElement('div') as HTMLDivElement & { getVideoData?: () => { video_id?: string } }
    moviePlayer.id = 'movie_player'
    moviePlayer.setAttribute('video-id', 'player456')
    moviePlayer.getVideoData = () => ({ video_id: 'data789' })
    document.body.appendChild(moviePlayer)

    expect(getYouTubeVideoId()).toBe('player456')

    moviePlayer.removeAttribute('video-id')
    expect(getYouTubeVideoId()).toBe('data789')
  })

  it('uses the URL query parameter and /live/ path when DOM does not provide an id', () => {
    setLocation('/watch?v=query123')
    expect(getYouTubeVideoId()).toBe('query123')

    setLocation('/live/live456')
    expect(getYouTubeVideoId()).toBe('live456')
  })
})
