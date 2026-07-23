import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentVideoId } from './useCurrentVideoId'

const setLocation = (path: string) => {
  window.history.pushState({}, '', `${window.location.origin}${path}`)
}

describe('useCurrentVideoId', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = ''
    setLocation('/watch?v=video-a')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('detects SPA video changes even when yt-navigate-finish is missing', () => {
    const { result } = renderHook(() => useCurrentVideoId())
    expect(result.current).toBe('video-a')

    setLocation('/watch?v=video-b')
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current).toBe('video-b')
  })

  it('detects a video switch within the same channel live URL', () => {
    setLocation('/@lofi/live')
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'video-a')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe')
    iframe.id = 'chatframe'
    iframe.src = 'https://www.youtube.com/live_chat?v=video-a'
    host.appendChild(iframe)
    document.body.append(watchFlexy, host)

    const { result } = renderHook(() => useCurrentVideoId())
    expect(result.current).toBe('video-a')

    watchFlexy.setAttribute('video-id', 'video-b')
    iframe.src = 'https://www.youtube.com/live_chat?v=video-b'
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current).toBe('video-b')
  })
})
