import { beforeEach, describe, expect, it } from 'vitest'
import { isYouTubeLiveVideo } from './isYouTubeLiveVideo'

beforeEach(() => {
  document.body.innerHTML = ''
  window.history.pushState({}, '', `${window.location.origin}/watch?v=current-video`)
})

describe('isYouTubeLiveVideo', () => {
  it('returns isLive when available', () => {
    const moviePlayer = document.createElement('div') as HTMLDivElement & {
      getVideoData?: () => { isLive?: boolean; isLiveContent?: boolean }
    }
    moviePlayer.id = 'movie_player'
    moviePlayer.getVideoData = () => ({ isLive: true, isLiveContent: false })
    document.body.appendChild(moviePlayer)

    expect(isYouTubeLiveVideo()).toBe(true)

    moviePlayer.getVideoData = () => ({ isLive: false, isLiveContent: true })
    expect(isYouTubeLiveVideo()).toBe(false)
  })

  it('falls back to isLiveContent when isLive is undefined', () => {
    const moviePlayer = document.createElement('div') as HTMLDivElement & {
      getVideoData?: () => { isLive?: boolean; isLiveContent?: boolean }
    }
    moviePlayer.id = 'movie_player'
    moviePlayer.getVideoData = () => ({ isLiveContent: true })
    document.body.appendChild(moviePlayer)

    expect(isYouTubeLiveVideo()).toBe(true)
  })

  it('returns false when no data is available', () => {
    expect(isYouTubeLiveVideo()).toBe(false)
  })

  it('ignores stale player data from another video', () => {
    const moviePlayer = document.createElement('div') as HTMLDivElement & {
      getVideoData?: () => { isLive?: boolean; video_id?: string }
    }
    moviePlayer.id = 'movie_player'
    moviePlayer.getVideoData = () => ({ isLive: true, video_id: 'stale-video' })
    document.body.appendChild(moviePlayer)

    expect(isYouTubeLiveVideo()).toBe(false)
  })
})
