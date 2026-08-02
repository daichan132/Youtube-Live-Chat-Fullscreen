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

    expect(click).toHaveBeenCalledTimes(1)
  })
})
