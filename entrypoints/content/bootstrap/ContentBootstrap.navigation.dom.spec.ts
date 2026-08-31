import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContentBootstrap, type ContentSession } from './ContentBootstrap'

const flushAsyncWork = () => vi.advanceTimersByTimeAsync(0)

describe('ContentBootstrap navigation-complete retries', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it.each([
    'https://www.youtube.com/watch?v=live-video',
    'https://www.youtube.com/live/live-video',
  ])('does not reset a terminal activation failure for %s', async href => {
    const createSession = vi.fn<() => Promise<ContentSession>>().mockRejectedValue(new Error('persistent startup failure'))
    const onPermanentFailure = vi.fn()
    const bootstrap = new ContentBootstrap(createSession, {
      readHref: () => href,
      onPermanentFailure,
    })

    bootstrap.start()
    await flushAsyncWork()
    await vi.advanceTimersByTimeAsync(250)
    await vi.advanceTimersByTimeAsync(1000)

    expect(createSession).toHaveBeenCalledTimes(3)
    expect(onPermanentFailure).toHaveBeenCalledOnce()

    await bootstrap.reconcileLocation(undefined, { navigationCompleted: true })
    await flushAsyncWork()

    expect(createSession).toHaveBeenCalledTimes(3)
    expect(onPermanentFailure).toHaveBeenCalledOnce()
    bootstrap.dispose()
  })
})
