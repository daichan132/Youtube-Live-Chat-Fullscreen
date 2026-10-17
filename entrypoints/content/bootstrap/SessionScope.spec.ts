import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSessionScope } from './SessionScope'

describe('SessionScope', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('cancels timers, animation frames, and listeners when disposed', () => {
    const scope = createSessionScope(7)
    const target = new EventTarget()
    const timerCallback = vi.fn()
    const frameCallback = vi.fn()
    const listener = vi.fn()

    scope.setTimeout(timerCallback, 5)
    scope.requestAnimationFrame(frameCallback)
    scope.listen(target, 'change', listener)
    target.dispatchEvent(new Event('change'))
    vi.advanceTimersByTime(20)

    expect(timerCallback).toHaveBeenCalledOnce()
    expect(frameCallback).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledOnce()

    scope.setTimeout(timerCallback, 50)
    scope.requestAnimationFrame(frameCallback)
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    scope.dispose()
    expect(vi.getTimerCount()).toBe(0)
    vi.runAllTimers()
    target.dispatchEvent(new Event('change'))

    expect(scope.generation).toBe(7)
    expect(scope.signal.aborted).toBe(true)
    expect(timerCallback).toHaveBeenCalledOnce()
    expect(frameCallback).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledOnce()
  })

  it('runs cleanup exactly once even when dispose is repeated', () => {
    const scope = createSessionScope(1)
    const cleanup = vi.fn()
    scope.addCleanup(cleanup)

    scope.dispose()
    scope.dispose()

    expect(cleanup).toHaveBeenCalledTimes(1)
  })
})
