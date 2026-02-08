import { beforeEach, describe, expect, it } from 'vitest'
import { isNativeChatExpanded, isNativeChatOpen } from './nativeChatState'

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

const createChatContainer = () => {
  const container = document.createElement('div')
  container.id = 'chat-container'
  document.body.appendChild(container)
  return container
}

const createChatFrameHost = () => {
  const host = document.createElement('ytd-live-chat-frame')
  document.body.appendChild(host)
  return host
}

const createChatFrame = (videoId: string) => {
  const iframe = document.createElement('iframe')
  iframe.id = 'chatframe'
  iframe.setAttribute('src', `https://www.youtube.com/live_chat?v=${videoId}`)
  document.body.appendChild(iframe)
  return iframe
}

const createWatchFlexy = () => {
  const watchFlexy = document.createElement('ytd-watch-flexy')
  watchFlexy.setAttribute('live-chat-present-and-expanded', '')
  document.body.appendChild(watchFlexy)
  return watchFlexy
}

beforeEach(() => {
  document.body.innerHTML = ''
  setLocation('/watch?v=video-a')
})

describe('isNativeChatOpen', () => {
  it('returns false when chat iframe belongs to another video', () => {
    createChatContainer()
    createChatFrameHost()
    createChatFrame('video-b')

    expect(isNativeChatOpen()).toBe(false)
  })

  it('returns true when chat container is visible and iframe matches current video', () => {
    createChatContainer()
    createChatFrameHost()
    createChatFrame('video-a')

    expect(isNativeChatOpen()).toBe(true)
  })

  it('returns false when iframe is about:blank even if chat is visible', () => {
    createChatContainer()
    createChatFrameHost()
    const iframe = document.createElement('iframe')
    iframe.id = 'chatframe'
    iframe.setAttribute('src', 'about:blank')
    document.body.appendChild(iframe)

    expect(isNativeChatOpen()).toBe(false)
  })

  it('returns false when chat host is hidden even if iframe exists', () => {
    createChatContainer()
    const host = createChatFrameHost()
    host.style.display = 'none'
    createChatFrame('video-a')

    expect(isNativeChatOpen()).toBe(false)
  })
})

describe('isNativeChatExpanded', () => {
  it('returns false when expanded attribute exists but native chat is hidden', () => {
    createWatchFlexy()
    createChatContainer()
    const host = createChatFrameHost()
    host.style.display = 'none'
    createChatFrame('video-a')

    expect(isNativeChatExpanded()).toBe(false)
  })

  it('returns true when expanded attribute exists and native chat is open', () => {
    createWatchFlexy()
    createChatContainer()
    createChatFrameHost()
    createChatFrame('video-a')

    expect(isNativeChatExpanded()).toBe(true)
  })
})
