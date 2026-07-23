import { beforeEach, describe, expect, it } from 'vitest'
import { getUnavailableCurrentLiveChatVideoId } from './liveChatAvailability'

const setLocation = (path: string) => {
  window.history.pushState({}, '', `${window.location.origin}${path}`)
}

describe('getUnavailableCurrentLiveChatVideoId', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('detects unavailable native chat on a channel live entry', () => {
    setLocation('/@lofi/live')
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'channel-live-video')

    const unavailable = document.createElement('yt-live-chat-unavailable-message-renderer')
    const body = document.createElement('body')
    body.appendChild(unavailable)
    const doc = {
      location: { href: 'https://www.youtube.com/live_chat?v=channel-live-video' } as Location,
      body,
      querySelector: (selector: string) => (selector === 'yt-live-chat-unavailable-message-renderer' ? unavailable : null),
    } as unknown as Document

    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe')
    iframe.id = 'chatframe'
    iframe.className = 'ytd-live-chat-frame'
    iframe.src = 'https://www.youtube.com/live_chat?v=channel-live-video'
    Object.defineProperty(iframe, 'contentDocument', { value: doc, configurable: true })
    host.appendChild(iframe)
    document.body.append(watchFlexy, host)

    expect(getUnavailableCurrentLiveChatVideoId()).toBe('channel-live-video')
  })
})
