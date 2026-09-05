import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContentBootstrap, type ContentSession, isYouTubeWatchSurface } from './ContentBootstrap'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(next => {
    resolve = next
  })
  return { promise, resolve }
}

const flushAsyncWork = () => vi.advanceTimersByTimeAsync(0)

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
    expect(isYouTubeWatchSurface('https://www.youtube.com/live/live')).toBe(false)
    expect(isYouTubeWatchSurface('https://example.com/watch?v=live')).toBe(false)
    expect(isYouTubeWatchSurface('https://www.youtube.com/')).toBe(false)
    expect(isYouTubeWatchSurface('https://www.youtube.com/results?search_query=live')).toBe(false)
    expect(isYouTubeWatchSurface('not a url')).toBe(false)
  })

  it('does not create a content session on unsupported pages', async () => {
    const createSession = vi.fn<() => Promise<ContentSession>>()
    const bootstrap = new ContentBootstrap(createSession, { readHref: () => 'https://www.youtube.com/' })
    bootstraps.push(bootstrap)

    bootstrap.start()
    await bootstrap.reconcileLocation()

    expect(createSession).not.toHaveBeenCalled()
  })

  it('accepts the URL supplied by WXT location changes', async () => {
    const session = { dispose: vi.fn() }
    const createSession = vi.fn(async () => session)
    const bootstrap = new ContentBootstrap(createSession, { readHref: () => 'https://www.youtube.com/' })
    bootstraps.push(bootstrap)
    bootstrap.start()

    await bootstrap.reconcileLocation('https://www.youtube.com/watch?v=live')

    expect(createSession).toHaveBeenCalledTimes(1)
  })

  it('creates one session on supported navigation and disposes it when leaving', async () => {
    let href = 'https://www.youtube.com/'
    const session = { dispose: vi.fn() }
    const createSession = vi.fn(async () => session)
    const bootstrap = new ContentBootstrap(createSession, { readHref: () => href })
    bootstraps.push(bootstrap)
    bootstrap.start()

    href = 'https://www.youtube.com/watch?v=live'
    await bootstrap.reconcileLocation()
    expect(createSession).toHaveBeenCalledTimes(1)

    href = 'https://www.youtube.com/results?search_query=live'
    await bootstrap.reconcileLocation()
    expect(session.dispose).toHaveBeenCalledTimes(1)
  })

  it('creates a session directly on live entry routes', async () => {
    let href = 'https://www.youtube.com/live/live-video'
    const session = { dispose: vi.fn() }
    const createSession = vi.fn(async () => session)
    const bootstrap = new ContentBootstrap(createSession, { readHref: () => href })
    bootstraps.push(bootstrap)

    bootstrap.start()
    await flushAsyncWork()
    expect(createSession).toHaveBeenCalledTimes(1)

    href = 'https://www.youtube.com/'
    await bootstrap.reconcileLocation()
    expect(session.dispose).toHaveBeenCalledTimes(1)
  })

  it('recovers from transient asynchronous session startup failures with bounded retries', async () => {
    let href = 'https://www.youtube.com/watch?v=live'
    const session = { dispose: vi.fn() }
    const createSession = vi
      .fn<() => Promise<ContentSession>>()
      .mockRejectedValueOnce(new Error('surface replacing'))
      .mockResolvedValueOnce(session)
    const bootstrap = new ContentBootstrap(createSession, { readHref: () => href })
    bootstraps.push(bootstrap)

    bootstrap.start()
    await flushAsyncWork()
    expect(createSession).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(250)
    expect(createSession).toHaveBeenCalledTimes(2)

    href = 'https://www.youtube.com/'
    await bootstrap.reconcileLocation()
    expect(session.dispose).toHaveBeenCalledTimes(1)
  })

  it('normalizes synchronous session construction failures into the retry flow', async () => {
    const href = 'https://www.youtube.com/watch?v=live'
    const session = { dispose: vi.fn() }
    const createSession = vi
      .fn<() => Promise<ContentSession>>()
      .mockImplementationOnce(() => {
        throw new Error('synchronous setup failure')
      })
      .mockResolvedValueOnce(session)
    const bootstrap = new ContentBootstrap(createSession, { readHref: () => href })
    bootstraps.push(bootstrap)

    bootstrap.start()
    await flushAsyncWork()
    expect(createSession).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(250)
    expect(createSession).toHaveBeenCalledTimes(2)
  })

  it('does not bypass the retry delay when duplicate navigation signals arrive', async () => {
    const href = 'https://www.youtube.com/watch?v=live'
    const session = { dispose: vi.fn() }
    const createSession = vi
      .fn<() => Promise<ContentSession>>()
      .mockRejectedValueOnce(new Error('surface replacing'))
      .mockResolvedValueOnce(session)
    const bootstrap = new ContentBootstrap(createSession, { readHref: () => href })
    bootstraps.push(bootstrap)

    bootstrap.start()
    await flushAsyncWork()
    expect(createSession).toHaveBeenCalledTimes(1)
    await bootstrap.reconcileLocation(href)
    await bootstrap.reconcileLocation(href)
    expect(createSession).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(249)
    expect(createSession).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(createSession).toHaveBeenCalledTimes(2)
  })

  it('resets the retry budget when the watch video changes', async () => {
    let href = 'https://www.youtube.com/watch?v=video-a'
    const createSession = vi.fn<() => Promise<ContentSession>>().mockRejectedValue(new Error('unavailable'))
    const bootstrap = new ContentBootstrap(createSession, { readHref: () => href })
    bootstraps.push(bootstrap)

    bootstrap.start()
    await flushAsyncWork()
    expect(createSession).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(250)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.runOnlyPendingTimersAsync()
    expect(createSession).toHaveBeenCalledTimes(3)

    href = 'https://www.youtube.com/watch?v=video-b'
    await bootstrap.reconcileLocation()
    expect(createSession).toHaveBeenCalledTimes(4)
    await vi.advanceTimersByTimeAsync(250)
    expect(createSession).toHaveBeenCalledTimes(5)
  })

  it('reports one sanitized failure after exhausting retries and stays stopped on that surface', async () => {
    const onPermanentFailure = vi.fn()
    const href = 'https://www.youtube.com/watch?v=private-video-id'
    const createSession = vi.fn<() => Promise<ContentSession>>().mockRejectedValue(new Error('unavailable'))
    const bootstrap = new ContentBootstrap(createSession, { readHref: () => href, onPermanentFailure })
    bootstraps.push(bootstrap)

    bootstrap.start()
    await flushAsyncWork()
    expect(createSession).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(250)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.runOnlyPendingTimersAsync()
    await bootstrap.reconcileLocation()

    expect(createSession).toHaveBeenCalledTimes(3)
    expect(onPermanentFailure).toHaveBeenCalledTimes(1)
    expect(onPermanentFailure).toHaveBeenCalledWith({
      code: 'CONTENT_SESSION_START_FAILED',
      route: 'watch',
      attempts: 3,
    })
    expect(JSON.stringify(onPermanentFailure.mock.calls)).not.toContain('private-video-id')
  })

  it('allows a completed channel navigation to retry a previously failed live-entry surface', async () => {
    const href = 'https://www.youtube.com/@lofi/live'
    const createSession = vi.fn<() => Promise<ContentSession>>().mockRejectedValue(new Error('unavailable'))
    const bootstrap = new ContentBootstrap(createSession, { readHref: () => href })
    bootstraps.push(bootstrap)

    bootstrap.start()
    await flushAsyncWork()
    expect(createSession).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(250)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.runOnlyPendingTimersAsync()
    expect(createSession).toHaveBeenCalledTimes(3)

    await bootstrap.reconcileLocation(href)
    expect(createSession).toHaveBeenCalledTimes(3)

    await bootstrap.reconcileLocation(href, { navigationCompleted: true })
    expect(createSession).toHaveBeenCalledTimes(4)
  })

  it('shares an in-flight activation and disposes a stale session after navigation', async () => {
    let href = 'https://www.youtube.com/watch?v=live'
    const pending = deferred<ContentSession>()
    const createSession = vi.fn(() => pending.promise)
    const bootstrap = new ContentBootstrap(createSession, { readHref: () => href })
    bootstraps.push(bootstrap)
    bootstrap.start()

    await bootstrap.reconcileLocation()
    expect(createSession).toHaveBeenCalledTimes(1)

    href = 'https://www.youtube.com/'
    await bootstrap.reconcileLocation()
    const stale = { dispose: vi.fn() }
    pending.resolve(stale)
    await flushAsyncWork()
    expect(stale.dispose).toHaveBeenCalledTimes(1)
  })
})
