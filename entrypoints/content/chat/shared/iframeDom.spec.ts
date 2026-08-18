import { beforeEach, describe, expect, it } from 'vitest'
import {
  getCurrentLiveChatIframe,
  getLiveChatIframes,
  isChatHostForCurrentVideo,
  isIframeForCurrentVideo,
  isLiveChatIframe,
  isReplayChatIframe,
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

  it('retains replay identity when Opera blanks the observed native iframe during fullscreen', () => {
    createWatchFlexy('current-video')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=current-video'
    host.appendChild(iframe)
    document.body.appendChild(host)
    markChatIframeObservedForCurrentVideo(iframe, 'current-video')

    iframe.removeAttribute('src')

    expect(isIframeForCurrentVideo(iframe, 'current-video')).toBe(true)
    expect(isReplayChatIframe(iframe)).toBe(true)
  })

  it('carries observed replay identity to a blank replacement iframe in the same host', () => {
    createWatchFlexy('current-video')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=current-video'
    host.appendChild(iframe)
    document.body.appendChild(host)
    markChatIframeObservedForCurrentVideo(iframe, 'current-video')

    const replacement = document.createElement('iframe')
    iframe.replaceWith(replacement)

    expect(isIframeForCurrentVideo(replacement, 'current-video')).toBe(true)
    expect(isReplayChatIframe(replacement)).toBe(true)
  })

  it('does not retain live identity after YouTube blanks an observed native iframe', () => {
    createWatchFlexy('current-video')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat?v=current-video'
    host.appendChild(iframe)
    document.body.appendChild(host)
    markChatIframeObservedForCurrentVideo(iframe, 'current-video')

    iframe.removeAttribute('src')

    expect(isLiveChatIframe(iframe)).toBe(false)
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

  it('matches a native iframe on a channel live entry when strong page signals agree', () => {
    setLocation('/@lofi/live')
    createWatchFlexy('channel-live-video')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe')
    iframe.id = 'chatframe'
    iframe.src = 'https://www.youtube.com/live_chat?v=channel-live-video'
    host.appendChild(iframe)
    document.body.appendChild(host)

    expect(isIframeForCurrentVideo(iframe, 'channel-live-video')).toBe(true)
    expect(getCurrentLiveChatIframe('channel-live-video')).toBe(iframe)
  })

  it('rejects native iframe matching when channel live page signals conflict', () => {
    setLocation('/@lofi/live')
    createWatchFlexy('next-video')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe')
    iframe.id = 'chatframe'
    iframe.src = 'https://www.youtube.com/live_chat?v=stale-video'
    host.appendChild(iframe)
    document.body.appendChild(host)

    expect(isIframeForCurrentVideo(iframe, null)).toBe(false)
    expect(getCurrentLiveChatIframe()).toBeNull()
  })

  it('selects the next native iframe while the previous channel-live iframe is still borrowed', () => {
    setLocation('/@lofi/live')
    const watchFlexy = createWatchFlexy('video-b')
    const borrowedIframe = document.createElement('iframe')
    borrowedIframe.id = 'chatframe'
    borrowedIframe.src = 'https://www.youtube.com/live_chat?v=video-a'
    borrowedIframe.setAttribute('data-ylc-chat', 'true')

    const nextHost = document.createElement('ytd-live-chat-frame')
    const nextIframe = document.createElement('iframe')
    nextIframe.className = 'ytd-live-chat-frame'
    nextIframe.src = 'https://www.youtube.com/live_chat?v=video-b'
    nextHost.appendChild(nextIframe)
    document.body.append(borrowedIframe, nextHost)

    expect(watchFlexy.getAttribute('video-id')).toBe('video-b')
    expect(getCurrentLiveChatIframe()).toBe(nextIframe)
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
