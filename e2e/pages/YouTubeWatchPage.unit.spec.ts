import type { Page } from '@playwright/test'
import { describe, expect, it, vi } from 'vitest'
import { YouTubeWatchPage } from './YouTubeWatchPage'

describe('YouTubeWatchPage', () => {
  it('bounds every fullscreen UI action by the requested timeout', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000)
    const hover = vi.fn().mockResolvedValue(undefined)
    const click = vi.fn().mockResolvedValue(undefined)
    const waitForFunction = vi.fn().mockResolvedValue(undefined)
    const page = {
      locator: vi.fn(() => ({ hover })),
      click,
      waitForFunction,
    } as unknown as Page

    await new YouTubeWatchPage(page).enterFullscreen({ timeout: 8000 })

    expect(hover).toHaveBeenCalledWith({ force: true, timeout: 5000 })
    expect(click).toHaveBeenCalledWith('button.ytp-fullscreen-button', { timeout: 8000 })
    expect(waitForFunction).toHaveBeenCalledWith(expect.any(Function), undefined, { timeout: 8000 })
  })

  it('bounds the fullscreen exit click by the requested timeout', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000)
    const hover = vi.fn().mockResolvedValue(undefined)
    const click = vi.fn().mockResolvedValue(undefined)
    const page = {
      locator: vi.fn(() => ({ hover })),
      click,
      evaluate: vi.fn().mockResolvedValue(false),
    } as unknown as Page

    await new YouTubeWatchPage(page).expectFullscreenExited({ timeout: 8000 })

    expect(hover).toHaveBeenCalledWith({ force: true, timeout: 5000 })
    expect(click).toHaveBeenCalledWith('button.ytp-fullscreen-button', { timeout: 8000 })
  })
})
