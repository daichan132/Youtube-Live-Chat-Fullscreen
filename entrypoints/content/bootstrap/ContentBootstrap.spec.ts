import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContentBootstrap, type ContentSession, isYouTubeWatchSurface } from './ContentBootstrap'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(next => {
    resolve = next
  })
  return { promise, resolve }
}

describe('ContentBootstrap', () => {
  const bootstraps: ContentBootstrap[] = []

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    for (const bootstrap of bootstraps) bootstrap.dispose()
    bootstraps.length = 0
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('recognizes only a YouTube watch path without reading the page DOM', () => {
    expect(isYouTubeWatchSurface('https://www.youtube.com/watch?v=live')).toBe(true)
    expect(isYouTubeWatchSurface('https://www.youtube.com/')).toBe(false)
    expect(isYouTubeWatchSurface('https://www.youtube.com/results?search_query=live')).toBe(false)
    expect(isYouTubeWatchSurface('not a url')).toBe(false)
  })

  it('does not create a content session on non-watch pages', async () => {
    const createSession = vi.fn<() => Promise<ContentSession>>()
    const bootstrap = new ContentBootstrap(createSession, () => 'https://www.youtube.com/')
    bootstraps.push(bootstrap)

    bootstrap.start()
    await bootstrap.reconcileLocation()

    expect(createSession).not.toHaveBeenCalled()
  })

  it('accepts the URL supplied by WXT location changes', async () => {
    const session = { dispose: vi.fn() }
    const createSession = vi.fn(async () => session)
    const bootstrap = new ContentBootstrap(createSession, () => 'https://www.youtube.com/')
    bootstraps.push(bootstrap)
    bootstrap.start()

    await bootstrap.reconcileLocation('https://www.youtube.com/watch?v=live')

    expect(createSession).toHaveBeenCalledTimes(1)
  })

  it('creates one session on watch navigation and disposes it when leaving', async () => {
    let href = 'https://www.youtube.com/'
    const session = { dispose: vi.fn() }
    const createSession = vi.fn(async () => session)
    const bootstrap = new ContentBootstrap(createSession, () => href)
    bootstraps.push(bootstrap)
    bootstrap.start()

    href = 'https://www.youtube.com/watch?v=live'
    await bootstrap.reconcileLocation()
    expect(createSession).toHaveBeenCalledTimes(1)

    href = 'https://www.youtube.com/results?search_query=live'
    await bootstrap.reconcileLocation()
    expect(session.dispose).toHaveBeenCalledTimes(1)
  })

  it('recovers from transient session startup failures with bounded retries', async () => {
    let href = 'https://www.youtube.com/watch?v=live'
    const session = { dispose: vi.fn() }
    const createSession = vi
      .fn<() => Promise<ContentSession>>()
      .mockRejectedValueOnce(new Error('surface replacing'))
      .mockResolvedValueOnce(session)
    const bootstrap = new ContentBootstrap(createSession, () => href)
    bootstraps.push(bootstrap)

    bootstrap.start()
    await vi.waitFor(() => expect(createSession).toHaveBeenCalledTimes(1))
    await vi.advanceTimersByTimeAsync(250)
    await vi.waitFor(() => expect(createSession).toHaveBeenCalledTimes(2))

    href = 'https://www.youtube.com/'
    await bootstrap.reconcileLocation()
    expect(session.dispose).toHaveBeenCalledTimes(1)
  })

  it('stops retrying after two failed recovery attempts', async () => {
    const createSession = vi.fn<() => Promise<ContentSession>>().mockRejectedValue(new Error('unavailable'))
    const bootstrap = new ContentBootstrap(createSession, () => 'https://www.youtube.com/watch?v=live')
    bootstraps.push(bootstrap)

    bootstrap.start()
    await vi.waitFor(() => expect(createSession).toHaveBeenCalledTimes(1))
    await vi.advanceTimersByTimeAsync(250)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.runOnlyPendingTimersAsync()

    expect(createSession).toHaveBeenCalledTimes(3)
  })

  it('shares an in-flight activation and disposes a stale session after navigation', async () => {
    let href = 'https://www.youtube.com/watch?v=live'
    const pending = deferred<ContentSession>()
    const createSession = vi.fn(() => pending.promise)
    const bootstrap = new ContentBootstrap(createSession, () => href)
    bootstraps.push(bootstrap)
    bootstrap.start()

    await bootstrap.reconcileLocation()
    expect(createSession).toHaveBeenCalledTimes(1)

    href = 'https://www.youtube.com/'
    await bootstrap.reconcileLocation()
    const stale = { dispose: vi.fn() }
    pending.resolve(stale)
    await vi.waitFor(() => expect(stale.dispose).toHaveBeenCalledTimes(1))
  })
})
