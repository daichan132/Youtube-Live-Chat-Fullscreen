import type { Page } from '@playwright/test'
import { describe, expect, it, vi } from 'vitest'
import { YouTubeWatchPage } from './YouTubeWatchPage'

describe('YouTubeWatchPage', () => {
  it.each([
    { timeout: 8000, hoverElapsed: 2000, clickElapsed: 3500, hoverBudget: 5000, clickBudget: 6000, waitBudget: 2500 },
    { timeout: 1200, hoverElapsed: 400, clickElapsed: 500, hoverBudget: 1200, clickBudget: 800, waitBudget: 300 },
    { timeout: 1200, hoverElapsed: 1200, clickElapsed: 0, hoverBudget: 1200, clickBudget: 1, waitBudget: 1 },
  ])('shares the $timeout ms deadline across fullscreen actions after a $hoverElapsed ms hover', async scenario => {
    const { timeout, hoverElapsed, clickElapsed } = scenario
    let now = 1000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const hover = vi.fn(async () => {
      now += hoverElapsed
    })
    const click = vi.fn(async (_selector: string, _options: { timeout: number }) => {
      now += clickElapsed
    })
    const waitForFunction = vi.fn(async (_predicate: unknown, _argument: unknown, _options: { timeout: number }) => {})
    const page = {
      locator: vi.fn(() => ({ hover })),
      click,
      waitForFunction,
    } as unknown as Page

    await new YouTubeWatchPage(page).enterFullscreen({ timeout })

    expect(hover).toHaveBeenCalledWith({ force: true, timeout: scenario.hoverBudget })
    expect(click).toHaveBeenCalledWith('button.ytp-fullscreen-button', { timeout: expect.any(Number) })
    const clickBudget = click.mock.calls[0]?.[1]?.timeout
    const waitBudget = waitForFunction.mock.calls[0]?.[2]?.timeout
    // Shorter waits may be valid, but later actions must not reset the deadline
    // or receive Playwright's unbounded timeout of zero. Fixtures prove success.
    expect(clickBudget).toBeGreaterThan(0)
    expect(clickBudget).toBeLessThanOrEqual(scenario.clickBudget)
    expect(waitBudget).toBeGreaterThan(0)
    expect(waitBudget).toBeLessThanOrEqual(scenario.waitBudget)
  })

  it('bounds the fullscreen exit click by the requested timeout', async () => {
    let now = 1000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const hover = vi.fn(async () => {
      now += 2000
    })
    const click = vi.fn().mockResolvedValue(undefined)
    const page = {
      locator: vi.fn(() => ({ hover })),
      click,
      evaluate: vi.fn().mockResolvedValue(false),
    } as unknown as Page

    await new YouTubeWatchPage(page).expectFullscreenExited({ timeout: 8000 })

    expect(hover).toHaveBeenCalledWith({ force: true, timeout: 5000 })
    expect(click).toHaveBeenCalledWith('button.ytp-fullscreen-button', { timeout: 6000 })
  })
})
