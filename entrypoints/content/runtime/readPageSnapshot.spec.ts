import { afterEach, describe, expect, it } from 'vitest'
import { YLC_OWNED_ATTR, YLC_SOURCE_ATTR, YLC_SOURCE_LIVE } from '@/entrypoints/content/chat/shared/iframeDom'
import { readPageSnapshot } from './readPageSnapshot'

describe('readPageSnapshot', () => {
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

    const snapshot = readPageSnapshot(staleManagedIframe)

    expect(snapshot.videoId).toBe('video-2')
    expect(snapshot.chatIframe).toBeNull()
    expect(snapshot.iframeMode).toBeNull()
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

    const snapshot = readPageSnapshot()

    expect(snapshot.playerIsLive).toBeNull()
  })
})
