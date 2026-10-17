import type { Locator } from '@playwright/test'
import { describe, expect, it, vi } from 'vitest'
import { reliableClick } from './actions'

describe('reliableClick', () => {
  it('waits for an asynchronous state change before escalating to another click', async () => {
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

    await reliableClick(locator, async () => active, { verifyTimeoutMs: 100 })

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
})
