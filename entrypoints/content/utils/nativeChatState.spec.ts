import { beforeEach, describe, expect, it } from 'vitest'
import { isNativeChatOpen } from './nativeChatState'

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

  it('returns false when URL points to a new video while DOM video marker is stale', () => {
    setLocation('/watch?v=video-b')
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'video-a')
    document.body.appendChild(watchFlexy)
    createChatContainer()
    createChatFrameHost()
    const iframe = document.createElement('iframe')
    iframe.id = 'chatframe'
    iframe.setAttribute('src', 'https://www.youtube.com/live_chat_replay?continuation=video-a')
    document.body.appendChild(iframe)

    expect(isNativeChatOpen()).toBe(false)
  })

  it('returns true when chat container is visible and iframe matches current video', () => {
    createChatContainer()
    createChatFrameHost()
    createChatFrame('video-a')

    expect(isNativeChatOpen()).toBe(true)
  })

  it('returns true when native iframe is only exposed through YouTube class selector', () => {
    createChatContainer()
    const host = createChatFrameHost()
    const iframe = document.createElement('iframe')
    iframe.className = 'ytd-live-chat-frame'
    iframe.setAttribute('src', 'https://www.youtube.com/live_chat?v=video-a')
    host.appendChild(iframe)

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
