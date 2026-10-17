import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import type { PageObservation } from '../platform/youtube/types'
import { ChatRuntimeImpl } from './ChatRuntime'

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
      getManifest: () => ({ version: '2.3.15' }),
    },
  },
}))

const observation = (): PageObservation => {
  const player = document.createElement('div')
  return {
    evidence: {
      generation: 0,
      videoId: 'video-1',
      route: 'watch',
      fullscreen: false,
      videoMode: 'live',
      chatAvailability: 'ready',
      capabilities: {
        canBorrowNativeChat: false,
        canCreateManagedLiveChat: true,
        canOpenArchiveChat: false,
        canRestoreNativeChat: false,
        canMountOverlay: true,
        canMountPlayerSwitch: true,
      },
      sourceKind: null,
      probeIds: [],
    },
    targets: {
      player,
      fullscreenRoot: null,
      rightControls: document.createElement('div'),
      nativeChatHost: null,
      nativeChatIframe: null,
      chatIframe: null,
      archiveOpenControl: null,
    },
  }
}

const flushFrame = () => vi.advanceTimersByTime(20)

describe('ChatRuntime unexpected error recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.replaceChildren()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  it('returns an active native iframe before recovering from a transient observation error', () => {
    window.history.replaceState({}, '', '/watch?v=video-1')
    const host = document.createElement('ytd-live-chat-frame')
    host.setAttribute('video-id', 'video-1')
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat?v=video-1'
    const chatDocument = document.implementation.createHTMLDocument('chat')
    chatDocument.body.innerHTML =
      '<yt-live-chat-renderer><yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer></yt-live-chat-renderer>'
    Object.defineProperty(iframe, 'contentDocument', {
      configurable: true,
      value: new Proxy(chatDocument, {
        get(target, key) {
          if (key === 'location') return { href: 'https://www.youtube.com/live_chat?v=video-1' }
          const value = Reflect.get(target, key, target)
          return typeof value === 'function' ? value.bind(target) : value
        },
      }),
    })
    host.append(iframe)
    const carrier = document.createElement('div')
    const current = observation()
    current.evidence.fullscreen = true
    current.evidence.sourceKind = 'native-live'
    current.evidence.capabilities.canBorrowNativeChat = true
    current.evidence.capabilities.canRestoreNativeChat = true
    current.targets.fullscreenRoot = current.targets.player
    current.targets.nativeChatHost = host
    current.targets.nativeChatIframe = iframe
    current.targets.chatIframe = iframe
    const player = current.targets.player
    const controls = current.targets.rightControls
    if (!player || !controls) throw new Error('Missing fixture player or controls')
    player.append(controls)
    document.body.append(player, host, carrier)
    const readObservation = vi.fn(() => current)
    const runtime = new ChatRuntimeImpl({ readObservation })

    runtime.setEnabled(true)
    runtime.setProfile(DEFAULT_CHAT_PROFILE)
    runtime.setOverlayContainer(carrier)
    runtime.start()
    try {
      flushFrame()
      expect(runtime.getSnapshot().status).toBe('active')
      expect(carrier.querySelector('iframe')).toBe(iframe)
      const firstGeneration = runtime.getGeneration()
      readObservation.mockImplementationOnce(() => {
        throw new Error('YouTube replaced the watch surface')
      })

      document.dispatchEvent(new Event('yt-page-data-updated'))
      flushFrame()

      expect(host.querySelector('iframe')).toBe(iframe)
      expect(carrier.querySelector('iframe')).toBeNull()
      expect(runtime.getSnapshot()).toMatchObject({ status: 'inactive', showOverlay: false, showSwitch: false })
      expect(runtime.getDiagnosticReport().runtime).toMatchObject({
        failureCode: 'UNEXPECTED_RUNTIME_ERROR',
        failureStage: 'observe-page',
        leases: { chat: { kind: 'none', state: 'none' } },
      })

      flushFrame()
      expect(runtime.getSnapshot().status).toBe('active')
      expect(runtime.getGeneration()).toBeGreaterThan(firstGeneration)
      expect(carrier.querySelector('iframe')).toBe(iframe)
    } finally {
      runtime.stop()
    }
    expect(host.querySelector('iframe')).toBe(iframe)
  })

  it('does not enter an unbounded retry loop after repeated errors', () => {
    const readObservation = vi.fn(() => {
      throw new Error('persistent adapter failure')
    })
    const runtime = new ChatRuntimeImpl({ readObservation })

    runtime.start()
    flushFrame()
    flushFrame()
    vi.runAllTimers()

    expect(readObservation).toHaveBeenCalledTimes(2)
    runtime.stop()
  })

  it('cancels the scheduled recovery when stopped', () => {
    const readObservation = vi.fn(() => {
      throw new Error('transient adapter failure')
    })
    const runtime = new ChatRuntimeImpl({ readObservation })

    runtime.start()
    flushFrame()
    expect(readObservation).toHaveBeenCalledOnce()

    runtime.stop()
    vi.runAllTimers()
    expect(readObservation).toHaveBeenCalledOnce()
  })
})
