import { beforeEach, describe, expect, it } from 'vitest'
import { resolveLiveSource } from './resolveLiveSource'

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

const createWatchFlexy = (attrs: Record<string, string | null>) => {
  const watchFlexy = document.createElement('ytd-watch-flexy')
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null) {
      watchFlexy.setAttribute(key, '')
      continue
    }
    watchFlexy.setAttribute(key, value)
  }
  document.body.appendChild(watchFlexy)
}

describe('resolveLiveSource', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocation('/watch?v=video-a')
  })

  it('returns a live direct source when live signals exist', () => {
    createWatchFlexy({ 'video-id': 'video-a', 'live-chat-present': null })

    const source = resolveLiveSource('video-a')
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('live_direct')
    expect(source?.url).toBe('https://www.youtube.com/live_chat?v=video-a')
  })

  it('returns null when video id is unavailable', () => {
    createWatchFlexy({ 'live-chat-present': null })

    const source = resolveLiveSource(null)
    expect(source).toBeNull()
  })

  it('returns null when neither live-now nor live chat signals are present', () => {
    createWatchFlexy({ 'video-id': 'video-a' })

    const source = resolveLiveSource('video-a')
    expect(source).toBeNull()
  })

  it('keeps live direct while a managed live iframe is attached', () => {
    const managedLiveIframe = document.createElement('iframe')
    managedLiveIframe.setAttribute('data-ylc-owned', 'true')
    managedLiveIframe.setAttribute('data-ylc-source', 'live_direct')

    const source = resolveLiveSource('video-a', managedLiveIframe)
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('live_direct')
    expect(source?.url).toBe('https://www.youtube.com/live_chat?v=video-a')
  })
})
