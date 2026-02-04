import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getLiveChatDocument, getLiveChatIframe, isLiveChatUnavailable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { hasLiveChatSignals } from './hasLiveChatSignals'

vi.mock('@/entrypoints/content/utils/hasPlayableLiveChat', async () => {
  const actual = await vi.importActual<typeof import('@/entrypoints/content/utils/hasPlayableLiveChat')>(
    '@/entrypoints/content/utils/hasPlayableLiveChat',
  )
  return {
    ...actual,
    getLiveChatIframe: vi.fn(),
    getLiveChatDocument: vi.fn(),
    isLiveChatUnavailable: vi.fn(),
  }
})

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

const createLiveChatDoc = () => {
  const doc = document.implementation.createHTMLDocument('chat')
  doc.body.innerHTML =
    '<yt-live-chat-renderer></yt-live-chat-renderer><yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer>'
  return doc as Document
}

const getLiveChatIframeMock = vi.mocked(getLiveChatIframe)
const getLiveChatDocumentMock = vi.mocked(getLiveChatDocument)
const isLiveChatUnavailableMock = vi.mocked(isLiveChatUnavailable)

describe('hasLiveChatSignals', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocation('/watch?v=video-a')
    getLiveChatIframeMock.mockReset()
    getLiveChatDocumentMock.mockReset()
    isLiveChatUnavailableMock.mockReset()
  })

  it('returns false when iframe belongs to another video', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat?v=video-b'
    getLiveChatIframeMock.mockReturnValue(iframe)
    getLiveChatDocumentMock.mockReturnValue(createLiveChatDoc())
    isLiveChatUnavailableMock.mockReturnValue(false)

    expect(hasLiveChatSignals()).toBe(false)
  })

  it('returns true when iframe belongs to current video and renderer is ready', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat?v=video-a'
    getLiveChatIframeMock.mockReturnValue(iframe)
    getLiveChatDocumentMock.mockReturnValue(createLiveChatDoc())
    isLiveChatUnavailableMock.mockReturnValue(false)

    expect(hasLiveChatSignals()).toBe(true)
  })

  it('falls back to watch attributes when no iframe is present', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('live-chat-present', '')
    document.body.appendChild(watchFlexy)

    getLiveChatIframeMock.mockReturnValue(null)

    expect(hasLiveChatSignals()).toBe(true)
  })
})
