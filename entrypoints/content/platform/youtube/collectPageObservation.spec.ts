import { afterEach, describe, expect, it } from 'vitest'
import { YLC_OWNED_ATTR, YLC_SOURCE_ATTR, YLC_SOURCE_LIVE } from '@/entrypoints/content/chat/shared/iframeDom'
import { collectPageObservation } from './collectPageObservation'

describe('collectPageObservation', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('does not reuse a managed iframe from the previous video after SPA navigation', () => {
    window.history.replaceState({}, '', '/watch?v=video-2')
    const staleManagedIframe = document.createElement('iframe')
    staleManagedIframe.src = 'https://www.youtube.com/live_chat?v=video-1'
    staleManagedIframe.setAttribute(YLC_OWNED_ATTR, 'true')
    staleManagedIframe.setAttribute(YLC_SOURCE_ATTR, YLC_SOURCE_LIVE)
    document.body.appendChild(staleManagedIframe)

    const observation = collectPageObservation(staleManagedIframe, 4)

    expect(observation.evidence).toMatchObject({
      generation: 4,
      videoId: 'video-2',
      route: 'watch',
      sourceKind: null,
    })
    expect(observation.targets.chatIframe).toBeNull()
  })

  it('keeps archived live metadata pending while replay DOM is still loading', () => {
    window.history.replaceState({}, '', '/watch?v=archive-1')
    const player = document.createElement('div') as unknown as HTMLElement & {
      getVideoData: () => {
        video_id: string
        isLive: boolean
        isLiveContent: boolean
      }
    }
    player.id = 'movie_player'
    player.getVideoData = () => ({
      video_id: 'archive-1',
      isLive: false,
      isLiveContent: true,
    })
    document.body.appendChild(player)

    const observation = collectPageObservation()

    expect(observation.evidence.videoMode).toBe('unknown')
    expect(observation.evidence.chatAvailability).toBe('pending')
  })

  it('falls back to page signals when getVideoData throws during player replacement', () => {
    window.history.replaceState({}, '', '/watch?v=live-1')
    const player = document.createElement('div') as HTMLElement & { getVideoData?: () => never }
    player.id = 'movie_player'
    player.setAttribute('video-id', 'live-1')
    player.getVideoData = () => {
      throw new Error('player replacement in progress')
    }
    const watch = document.createElement('ytd-watch-flexy')
    watch.setAttribute('video-id', 'live-1')
    watch.setAttribute('is-live-now', '')
    document.body.append(player, watch)

    const observation = collectPageObservation()

    expect(observation.evidence.videoMode).toBe('live')
    expect(observation.evidence.chatAvailability).toBe('ready')
  })

  it('keeps channel live routes active while the current video id is still ambiguous', () => {
    window.history.replaceState({}, '', '/@lofi/live')
    const firstWatch = document.createElement('ytd-watch-flexy')
    firstWatch.setAttribute('video-id', 'video-a')
    const secondWatch = document.createElement('ytd-watch-grid')
    secondWatch.setAttribute('video-id', 'video-b')
    document.body.append(firstWatch, secondWatch)

    const observation = collectPageObservation()

    expect(observation.evidence).toMatchObject({ route: 'live', videoId: null, videoMode: 'unknown', chatAvailability: 'pending' })
  })

  it('keeps DOM targets outside the serializable evidence payload', () => {
    window.history.replaceState({}, '', '/watch?v=video-1')
    const player = document.createElement('div')
    player.id = 'movie_player'
    const controls = document.createElement('div')
    controls.className = 'ytp-right-controls'
    player.appendChild(controls)
    document.body.appendChild(player)

    const observation = collectPageObservation()
    const serialized = JSON.parse(JSON.stringify(observation.evidence)) as Record<string, unknown>

    expect(serialized).not.toHaveProperty('player')
    expect(serialized).not.toHaveProperty('rightControls')
    expect(serialized).not.toHaveProperty('chatIframe')
    expect(observation.targets.player).toBe(player)
    expect(observation.evidence.probeIds).toEqual(expect.arrayContaining(['player.v1.1', 'controls.right.v1.1']))
  })
})
