import { describe, expect, it } from 'vitest'
import { getYouTubePlayerVideoId, readYouTubePlayerVideoData, type YouTubeMoviePlayer } from './playerVideoData'

describe('playerVideoData', () => {
  it('returns null when the transient YouTube player API throws', () => {
    const player = document.createElement('div') as YouTubeMoviePlayer
    player.getVideoData = () => {
      throw new Error('player replacement in progress')
    }

    expect(readYouTubePlayerVideoData(player)).toBeNull()
  })

  it('falls back to the player video-id attribute', () => {
    const player = document.createElement('div') as YouTubeMoviePlayer
    player.setAttribute('video-id', 'attribute-video')

    expect(getYouTubePlayerVideoId(player, null)).toBe('attribute-video')
  })
})
