import { afterEach, describe, expect, it } from 'vitest'
import { YLC_OWNED_ATTR, YLC_SOURCE_ATTR, YLC_SOURCE_LIVE } from '@/entrypoints/content/chat/shared/iframeDom'
import { collectPageObservation } from './collectPageObservation'

const VIDEO_ID = 'lifecycle-video'

const createWatchAndPlayer = (videoData: Record<string, unknown>) => {
  window.history.replaceState({}, '', `/watch?v=${VIDEO_ID}`)
  const watch = document.createElement('ytd-watch-flexy')
  watch.setAttribute('video-id', VIDEO_ID)
  document.body.append(watch)

  const player = document.createElement('div')
  player.id = 'movie_player'
  Object.assign(player, {
    getVideoData: () => ({ video_id: VIDEO_ID, ...videoData }),
  })
  document.body.append(player)
  return player
}

const createManagedLiveIframe = () => {
  const iframe = document.createElement('iframe')
  iframe.src = `https://www.youtube.com/live_chat?v=${VIDEO_ID}`
  iframe.setAttribute(YLC_OWNED_ATTR, 'true')
  iframe.setAttribute(YLC_SOURCE_ATTR, YLC_SOURCE_LIVE)
  document.body.append(iframe)
  return iframe
}

const createNativeChatHost = (label: string, withLiveIframe = false) => {
  const host = document.createElement('ytd-live-chat-frame')
  host.setAttribute('video-id', VIDEO_ID)

  if (withLiveIframe) {
    const iframe = document.createElement('iframe')
    iframe.id = 'chatframe'
    iframe.src = `https://www.youtube.com/live_chat?v=${VIDEO_ID}`
    host.append(iframe)
  }

  const slot = document.createElement('div')
  slot.id = 'show-hide-button'
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', label)
  slot.append(button)
  host.append(slot)
  document.body.append(host)
  return { host, button, iframe: host.querySelector<HTMLIFrameElement>('#chatframe') }
}

describe('collectPageObservation live lifecycle evidence', () => {
  afterEach(() => {
    document.body.replaceChildren()
    window.history.replaceState({}, '', '/')
  })

  it('preserves a live lease when player state is unknown and only a generic chat control exists', () => {
    createWatchAndPlayer({})
    const managedIframe = createManagedLiveIframe()
    createNativeChatHost('Show chat')

    const observation = collectPageObservation(managedIframe)

    expect(observation.evidence).toMatchObject({
      videoMode: 'live',
      chatAvailability: 'ready',
      sourceKind: 'managed-live',
      capabilities: {
        canCreateManagedLiveChat: false,
        canOpenArchiveChat: false,
      },
    })
    expect(observation.targets.chatIframe).toBe(managedIframe)
  })

  it('releases a managed live lease after the player explicitly ends even before replay controls appear', () => {
    createWatchAndPlayer({ isLive: false, isLiveContent: true })
    const managedIframe = createManagedLiveIframe()

    const observation = collectPageObservation(managedIframe)

    expect(observation.evidence).toMatchObject({
      videoMode: 'archive',
      chatAvailability: 'pending',
      sourceKind: null,
      capabilities: {
        canCreateManagedLiveChat: false,
        canOpenArchiveChat: false,
      },
    })
    expect(observation.targets.chatIframe).toBeNull()
  })

  it('releases a borrowed live iframe when replay controls prove the same URL has transitioned to archive', () => {
    createWatchAndPlayer({ isLive: false, isLiveContent: true })
    const { button, iframe } = createNativeChatHost('Show chat replay', true)
    if (!iframe) throw new Error('Expected native live iframe')

    const observation = collectPageObservation(iframe)

    expect(observation.evidence).toMatchObject({
      videoMode: 'archive',
      chatAvailability: 'pending',
      sourceKind: null,
      capabilities: {
        canOpenArchiveChat: true,
        canRestoreNativeChat: true,
      },
    })
    expect(observation.targets.chatIframe).toBeNull()
    expect(observation.targets.archiveOpenControl).toBe(button)
  })
})
