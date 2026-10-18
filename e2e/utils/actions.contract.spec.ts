import type { Locator } from '@playwright/test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reliableClick } from './actions'

afterEach(() => vi.useRealTimers())

describe('reliableClick', () => {
  it('waits for an asynchronous state change before escalating to another click', async () => {
    vi.useFakeTimers()
    let active = false
    const click = vi.fn(async () => {
      setTimeout(() => {
        active = true
      }, 20)
    })
    const locator = {
      click,
      dispatchEvent: vi.fn(),
    } as unknown as Locator

    // Capture the state at resolution: checking it after timers have finished
    // would also pass if the helper returned before the UI changed.
    const completed = reliableClick(locator, async () => active, { verifyTimeoutMs: 100 }).then(() => active)
    const result = expect(completed).resolves.toBe(true)
    await vi.runAllTimersAsync()
    await result

    expect(active).toBe(true)
    expect(click).toHaveBeenCalledTimes(1)
    expect(locator.dispatchEvent).not.toHaveBeenCalled()
  })

  it('rejects an unchanged state without silently using the opt-in JS fallback', async () => {
    const locator = { click: vi.fn(), dispatchEvent: vi.fn() } as unknown as Locator

    await expect(reliableClick(locator, async () => false)).rejects.toThrow('did not produce expected state')

    expect(locator.dispatchEvent).not.toHaveBeenCalled()
  })

  it('allows JS fallback only when opted in and still requires the resulting state', async () => {
    let active = false
    const locator = {
      click: vi.fn(),
      dispatchEvent: vi.fn(async () => {
        active = true
      }),
    } as unknown as Locator

    await reliableClick(locator, async () => active, { allowJsFallback: true })
    expect(active).toBe(true)

    await expect(reliableClick(locator, async () => false, { allowJsFallback: true })).rejects.toThrow('all 3 stages failed')
  })

  it('rejects a failed pointer action instead of silently switching to an untrusted event', async () => {
    let active = false
    const locator = {
      click: async () => {},
      dispatchEvent: async () => {
        active = true
      },
    } as unknown as Locator

    await expect(reliableClick(locator, async () => active)).rejects.toThrow('normal/force click did not produce expected state')
    expect(active).toBe(false)
  })

  it('allows an explicitly requested event fallback only when its expected state is reached', async () => {
    let active = false
    const locator = {
      click: async () => {},
      dispatchEvent: async (event: string) => {
        if (event === 'click') active = true
      },
    } as unknown as Locator

    await reliableClick(locator, async () => active, { allowJsFallback: true })
    expect(active).toBe(true)
    active = false
    locator.dispatchEvent = async () => {}
    await expect(reliableClick(locator, async () => active, { allowJsFallback: true })).rejects.toThrow(
      'all 3 stages failed to produce expected state',
    )
  })
})
