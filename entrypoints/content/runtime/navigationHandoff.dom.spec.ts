import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import type { PageObservation } from '../platform/youtube/types'
import { ChatRuntimeImpl } from './ChatRuntime'

let runtime: ChatRuntimeImpl | undefined
let navigation: EventTarget

beforeEach(() => {
  vi.useFakeTimers()
  window.history.replaceState({}, '', '/watch?v=video-1')
  navigation = new EventTarget()
  vi.stubGlobal('navigation', navigation)
})

afterEach(() => {
  runtime?.stop()
  runtime = undefined
  document.body.replaceChildren()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const borrowNativeFrame = () => {
  const host = document.createElement('ytd-live-chat-frame')
  const cachedFrame = document.createElement('iframe')
  cachedFrame.src = 'https://www.youtube.com/live_chat_replay?v=video-1'
  host.append(cachedFrame)
  const player = document.createElement('div')
  const carrier = document.createElement('div')
  document.body.append(host, player, carrier)
  // Model a ready same-origin chat document without a network request in jsdom.
  Object.defineProperty(cachedFrame, 'contentDocument', { configurable: true, value: document })
  const observation: PageObservation = {
    evidence: {
      generation: 0,
      videoId: 'video-1',
      route: 'watch',
      fullscreen: true,
      videoMode: 'archive',
      chatAvailability: 'ready',
      capabilities: {
        canBorrowNativeChat: true,
        canCreateManagedLiveChat: false,
        canOpenArchiveChat: false,
        canRestoreNativeChat: true,
        canMountOverlay: true,
        canMountPlayerSwitch: false,
      },
      sourceKind: 'native-replay',
      probeIds: [],
    },
    targets: {
      player,
      fullscreenRoot: player,
      rightControls: null,
      nativeChatHost: host,
      nativeChatIframe: cachedFrame,
      chatIframe: cachedFrame,
      archiveOpenControl: null,
    },
  }
  runtime = new ChatRuntimeImpl({
    readObservation: () => observation,
    portalHost: { clear() {}, sync: () => ({ overlayRoot: null, switchContainer: null }) },
  })
  runtime.start()
  runtime.setEnabled(true)
  runtime.setProfile(DEFAULT_CHAT_PROFILE)
  runtime.setOverlayContainer(carrier)
  vi.advanceTimersByTime(20)
  expect(carrier.contains(cachedFrame)).toBe(true)
  return { host, cachedFrame, carrier, runtime }
}

const navigate = (destination = 'https://www.youtube.com/watch?v=video-2', cancelled = false) => {
  const event = new Event('navigate', { cancelable: true })
  Object.defineProperty(event, 'destination', { value: { url: destination } })
  if (cancelled) event.preventDefault()
  navigation.dispatchEvent(event)
  return event
}

describe('native iframe navigation handoff', () => {
  it('returns YouTube its cached iframe before URL commit and session disposal', () => {
    const { host, cachedFrame, runtime } = borrowNativeFrame()
    navigate()
    expect(host.contains(cachedFrame)).toBe(true)
    expect(cachedFrame.isConnected).toBe(true)

    window.history.replaceState({}, '', '/watch?v=video-2')
    runtime.stop()
    expect(host.contains(cachedFrame)).toBe(true)
    expect(cachedFrame.isConnected).toBe(true)
  })

  it('reborrows the same native iframe in the same generation when a later listener cancels navigation', () => {
    const { host, cachedFrame, carrier, runtime } = borrowNativeFrame()
    const generation = runtime.getGeneration()
    navigation.addEventListener('navigate', event => event.preventDefault())
    expect(navigate().defaultPrevented).toBe(true)
    expect(host.contains(cachedFrame)).toBe(true)
    vi.advanceTimersByTime(20)
    expect(carrier.contains(cachedFrame)).toBe(true)
    expect(runtime.getGeneration()).toBe(generation)
    runtime.stop()
    expect(host.contains(cachedFrame)).toBe(true)
  })

  it.each([
    { destination: 'https://www.youtube.com/watch?v=video-1#details', cancelled: false },
    { destination: 'https://www.youtube.com/watch?v=video-2', cancelled: true },
  ])('keeps the native frame attached for $destination (already cancelled: $cancelled)', ({ destination, cancelled }) => {
    const { cachedFrame, carrier } = borrowNativeFrame()
    navigate(destination, cancelled)
    expect(carrier.contains(cachedFrame)).toBe(true)
  })
})
