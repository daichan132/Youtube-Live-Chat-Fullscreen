import { afterEach, describe, expect, it } from 'vitest'
import { collectPageObservation } from './collectPageObservation'

const mountPage = (playerData?: Record<string, unknown>) => {
  window.history.replaceState({}, '', '/watch?v=current')
  document.body.innerHTML = '<ytd-watch-flexy video-id="current"></ytd-watch-flexy><div id="movie_player"></div>'
  const player = document.getElementById('movie_player')
  if (!player) throw new Error('Missing fixture player')
  if (playerData) Object.assign(player, { getVideoData: () => playerData })
  return document.querySelector('ytd-watch-flexy') as HTMLElement
}

describe('current page chat classification', () => {
  afterEach(() => {
    document.body.replaceChildren()
    window.history.replaceState({}, '', '/')
  })

  it.each(['ytp-time-display ytp-live', 'ytp-live-badge ytp-live-badge-is-livehead'])(
    'uses current live UI while an old replay iframe is still mounted: %s',
    className => {
      mountPage({ video_id: 'current' })
      const signal = document.createElement('div')
      signal.className = className
      const stale = document.createElement('iframe')
      stale.id = 'chatframe'
      stale.src = 'https://www.youtube.com/live_chat_replay?v=previous'
      document.body.append(signal, stale)

      const observation = collectPageObservation()

      expect(observation.evidence).toMatchObject({
        videoMode: 'live',
        chatAvailability: 'ready',
        sourceKind: null,
        capabilities: { canCreateManagedLiveChat: true },
      })
      expect(observation.targets.chatIframe).toBeNull()
    },
  )

  it('does not let stale live UI override an explicit non-live player', () => {
    const watch = mountPage({ video_id: 'current', isLive: false, isLiveContent: false })
    watch.setAttribute('is-live-now', '')
    const signal = document.createElement('div')
    signal.className = 'ytp-time-display ytp-live'
    document.body.append(signal)

    expect(collectPageObservation().evidence).toMatchObject({
      videoMode: 'vod',
      chatAvailability: 'unavailable',
      capabilities: { canCreateManagedLiveChat: false },
    })
  })

  it.each(['stale-watch', 'stale-player'])('rejects live signals from another video: %s', staleSource => {
    const watch = mountPage(staleSource === 'stale-player' ? { video_id: 'previous', isLive: true } : undefined)
    watch.setAttribute('is-live-now', '')
    if (staleSource === 'stale-watch') watch.setAttribute('video-id', 'previous')

    expect(collectPageObservation().evidence).toMatchObject({
      videoMode: 'unknown',
      chatAvailability: 'pending',
      capabilities: { canCreateManagedLiveChat: false },
    })
  })

  it('does not treat a replay iframe with an unloaded document as playable', () => {
    const watch = mountPage({ video_id: 'current', isLive: false, isLiveContent: true })
    watch.setAttribute('live-chat-present-and-expanded', '')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe')
    iframe.id = 'chatframe'
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=current'
    Object.defineProperty(iframe, 'contentDocument', { value: { location: { href: 'about:blank' } } })
    host.append(iframe)
    watch.append(host)

    expect(collectPageObservation().evidence).toMatchObject({
      videoMode: 'archive',
      chatAvailability: 'pending',
      sourceKind: 'native-replay',
      capabilities: { canBorrowNativeChat: false, canCreateManagedLiveChat: false },
    })
  })
})
