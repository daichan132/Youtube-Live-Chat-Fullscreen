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

  it('installs the session for the WXT destination once that destination is current', async () => {
    let href = 'https://www.youtube.com/'
    const destination = 'https://www.youtube.com/watch?v=live'
    const pending = deferred<ContentSession>()
    const session = { dispose: vi.fn() }
    const createSession = vi.fn(() => pending.promise)
    const bootstrap = new ContentBootstrap(createSession, { readHref: () => href })
    bootstraps.push(bootstrap)
    bootstrap.start()
    expect(bootstrap.getStatus().status).toBe('unsupported')

    // The supplied URL can begin lazy startup before a location accessor catches up.
    const activation = bootstrap.reconcileLocation(destination)
    await flushAsyncWork()
    expect(createSession).toHaveBeenCalledTimes(1)
    expect(session.dispose).not.toHaveBeenCalled()

    href = destination
    pending.resolve(session)
    await activation
    await bootstrap.reconcileLocation(destination)
    expect(bootstrap.getStatus().status).toBe('running')
    expect(createSession).toHaveBeenCalledTimes(1)
    expect(session.dispose).not.toHaveBeenCalled()

    href = 'https://www.youtube.com/results?search_query=live'
    await bootstrap.reconcileLocation(href)
    expect(bootstrap.getStatus().status).toBe('unsupported')
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

  it('allows a new session after disposal throws during navigation away', async () => {
    let href = 'https://www.youtube.com/watch?v=live'
    const failure = new Error('session cleanup failed')
    const previous = {
      dispose: vi.fn(() => {
        throw failure
      }),
    }
    const next = { dispose: vi.fn() }
    const createSession = vi.fn<() => Promise<ContentSession>>().mockResolvedValueOnce(previous).mockResolvedValueOnce(next)
    const bootstrap = new ContentBootstrap(createSession, { readHref: () => href })
    bootstraps.push(bootstrap)
    bootstrap.start()
    await flushAsyncWork()
    expect(bootstrap.getStatus().status).toBe('running')

    href = 'https://www.youtube.com/'
    await expect(bootstrap.reconcileLocation()).rejects.toBe(failure)
    expect(previous.dispose).toHaveBeenCalledOnce()

    href = 'https://www.youtube.com/watch?v=live'
    await bootstrap.reconcileLocation()
    expect(createSession).toHaveBeenCalledTimes(2)
    expect(bootstrap.getStatus().status).toBe('running')
  })

  it('allows restart after disposal throws', async () => {
    const href = 'https://www.youtube.com/watch?v=live'
    const failure = new Error('session cleanup failed')
    const previous = {
      dispose: vi.fn(() => {
        throw failure
      }),
    }
    const next = { dispose: vi.fn() }
    const createSession = vi.fn<() => Promise<ContentSession>>().mockResolvedValueOnce(previous).mockResolvedValueOnce(next)
    const bootstrap = new ContentBootstrap(createSession, { readHref: () => href })
    bootstraps.push(bootstrap)
    bootstrap.start()
    await flushAsyncWork()

    expect(() => bootstrap.dispose()).toThrow(failure)
    expect(previous.dispose).toHaveBeenCalledOnce()
    bootstrap.start()
    await flushAsyncWork()
    expect(createSession).toHaveBeenCalledTimes(2)
    expect(bootstrap.getStatus().status).toBe('running')
  })
})
