import { beforeEach, describe, expect, it } from 'vitest'
import {
  ensureChatIframeObservation,
  getCurrentLiveChatIframe,
  getLiveChatIframes,
  isChatHostForCurrentVideo,
  isIframeForCurrentVideo,
  markChatIframeObservedForCurrentVideo,
} from './iframeDom'

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

const createWatchFlexy = (videoId: string) => {
  const watchFlexy = document.createElement('ytd-watch-flexy')
  watchFlexy.setAttribute('video-id', videoId)
  document.body.appendChild(watchFlexy)
  return watchFlexy
}

const flushMutationObserver = () => new Promise(resolve => setTimeout(resolve, 0))

describe('isIframeForCurrentVideo', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocation('/watch?v=current-video')
  })

  it('matches iframe URLs with the current video id', () => {
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=current-video'

    expect(isIframeForCurrentVideo(iframe, 'current-video')).toBe(true)
  })

  it('rejects iframe URLs for another video', () => {
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=stale-video'

    expect(isIframeForCurrentVideo(iframe, 'current-video')).toBe(false)
  })

  it('allows continuation-only iframe URLs only after they are observed for the current video', () => {
    createWatchFlexy('current-video')
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat_replay?continuation=current-replay'
    markChatIframeObservedForCurrentVideo(iframe, 'current-video')

    expect(isIframeForCurrentVideo(iframe, 'current-video')).toBe(true)
  })

  it('rejects unobserved continuation-only iframe URLs even when page DOM points at the current video', () => {
    createWatchFlexy('current-video')
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat_replay?continuation=current-replay'

    expect(isIframeForCurrentVideo(iframe, 'current-video')).toBe(false)
  })

  it('rejects continuation-only iframe URLs when page DOM still points at a stale video', () => {
    createWatchFlexy('stale-video')
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat_replay?continuation=stale-replay'

    expect(isIframeForCurrentVideo(iframe, 'current-video')).toBe(false)
  })

  it('does not overwrite an observed continuation-only iframe marker after navigation', () => {
    createWatchFlexy('current-video')
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat_replay?continuation=current-replay'
    markChatIframeObservedForCurrentVideo(iframe, 'current-video')

    setLocation('/watch?v=next-video')
    document.body.innerHTML = ''
    createWatchFlexy('next-video')
    iframe.src = 'https://www.youtube.com/live_chat_replay?continuation=stale-replay-after-navigation'
    markChatIframeObservedForCurrentVideo(iframe, 'next-video')

    expect(isIframeForCurrentVideo(iframe, 'next-video')).toBe(false)
  })
})

describe('getLiveChatIframes', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('collects #chatframe and fallback class iframes without duplicates', () => {
    const fallbackHost = document.createElement('ytd-live-chat-frame')
    const fallback = document.createElement('iframe')
    fallback.className = 'ytd-live-chat-frame'
    fallbackHost.appendChild(fallback)
    document.body.appendChild(fallbackHost)

    const chatFrame = document.createElement('iframe')
    chatFrame.id = 'chatframe'
    document.body.appendChild(chatFrame)

    expect(getLiveChatIframes()).toEqual([chatFrame, fallback])
  })

  it('collects YouTube live chat frame iframe class when #chatframe is absent', () => {
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe')
    iframe.className = 'ytd-live-chat-frame'
    host.appendChild(iframe)
    document.body.appendChild(host)

    expect(getLiveChatIframes()).toEqual([iframe])
  })

  it('finds the current iframe when a stale #chatframe appears first', () => {
    setLocation('/watch?v=current-video')
    const staleHost = document.createElement('ytd-live-chat-frame')
    const staleIframe = document.createElement('iframe')
    staleIframe.id = 'chatframe'
    staleIframe.src = 'https://www.youtube.com/live_chat_replay?v=stale-video'
    staleHost.appendChild(staleIframe)
    document.body.appendChild(staleHost)

    const currentHost = document.createElement('ytd-live-chat-frame')
    const currentIframe = document.createElement('iframe')
    currentIframe.id = 'chatframe'
    currentIframe.src = 'https://www.youtube.com/live_chat_replay?v=current-video'
    currentHost.appendChild(currentIframe)
    document.body.appendChild(currentHost)

    expect(getCurrentLiveChatIframe('current-video')).toBe(currentIframe)
  })

  it('marks continuation-only iframe after the page video marker catches up', async () => {
    setLocation('/watch?v=current-video')
    const watchFlexy = createWatchFlexy('stale-video')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat_replay?continuation=current-replay'
    host.appendChild(iframe)
    document.body.appendChild(host)

    ensureChatIframeObservation()
    expect(isIframeForCurrentVideo(iframe, 'current-video')).toBe(false)

    watchFlexy.setAttribute('video-id', 'current-video')
    await flushMutationObserver()

    expect(isIframeForCurrentVideo(iframe, 'current-video')).toBe(true)
  })

  it('marks continuation-only iframe after the page video marker is added', async () => {
    setLocation('/watch?v=current-video')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat_replay?continuation=current-replay'
    host.appendChild(iframe)
    document.body.appendChild(host)

    ensureChatIframeObservation()
    expect(isIframeForCurrentVideo(iframe, 'current-video')).toBe(false)

    createWatchFlexy('current-video')
    await flushMutationObserver()

    expect(isIframeForCurrentVideo(iframe, 'current-video')).toBe(true)
  })
})

describe('isChatHostForCurrentVideo', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocation('/watch?v=current-video')
  })

  it('matches a host through its current child iframe when the host has no marker', () => {
    const host = document.createElement('ytd-live-chat-frame') as HTMLElement
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=current-video'
    host.appendChild(iframe)

    expect(isChatHostForCurrentVideo(host)).toBe(true)
  })

  it('matches a host through its current child iframe even when the host marker is stale', () => {
    const host = document.createElement('ytd-live-chat-frame') as HTMLElement
    host.setAttribute('video-id', 'stale-video')
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=current-video'
    host.appendChild(iframe)

    expect(isChatHostForCurrentVideo(host)).toBe(true)
  })

  it('rejects a host whose only child iframe belongs to another video', () => {
    const host = document.createElement('ytd-live-chat-frame') as HTMLElement
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=stale-video'
    host.appendChild(iframe)

    expect(isChatHostForCurrentVideo(host)).toBe(false)
  })
})
