import { afterEach, describe, expect, it, vi } from 'vitest'
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

  afterEach(() => {
    for (const bootstrap of bootstraps) bootstrap.dispose()
    bootstraps.length = 0
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

  it('creates one session on watch navigation and disposes it when leaving', async () => {
    let href = 'https://www.youtube.com/'
    const session = { dispose: vi.fn() }
    const createSession = vi.fn(async () => session)
    const bootstrap = new ContentBootstrap(createSession, () => href)
    bootstraps.push(bootstrap)
    bootstrap.start()

    href = 'https://www.youtube.com/watch?v=live'
    document.dispatchEvent(new Event('yt-navigate-finish'))
    await vi.waitFor(() => expect(createSession).toHaveBeenCalledTimes(1))
    await bootstrap.reconcileLocation()

    href = 'https://www.youtube.com/results?search_query=live'
    document.dispatchEvent(new Event('yt-navigate-finish'))
    await vi.waitFor(() => expect(session.dispose).toHaveBeenCalledTimes(1))
  })

  it('shares an in-flight activation and disposes a stale session after navigation', async () => {
    let href = 'https://www.youtube.com/watch?v=live'
    const pending = deferred<ContentSession>()
    const createSession = vi.fn(() => pending.promise)
    const bootstrap = new ContentBootstrap(createSession, () => href)
    bootstraps.push(bootstrap)
    bootstrap.start()

    document.dispatchEvent(new Event('yt-navigate-finish'))
    expect(createSession).toHaveBeenCalledTimes(1)

    href = 'https://www.youtube.com/'
    await bootstrap.reconcileLocation()
    const stale = { dispose: vi.fn() }
    pending.resolve(stale)
    await vi.waitFor(() => expect(stale.dispose).toHaveBeenCalledTimes(1))
  })
})
