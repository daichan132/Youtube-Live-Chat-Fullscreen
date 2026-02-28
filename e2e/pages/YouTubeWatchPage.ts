import type { Page } from '@playwright/test'
import { TIMEOUT } from '@e2e/support/constants'
import { acceptYouTubeConsent } from '@e2e/utils/liveUrl'
import { FULLSCREEN_BUTTON, MOVIE_PLAYER, NATIVE_CHAT_FRAME } from '@e2e/utils/selectors'

export class YouTubeWatchPage {
  constructor(private page: Page) {}

  async goto(url: string, options?: { timeout?: number }) {
    const timeout = options?.timeout ?? TIMEOUT.PAGE_GOTO
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout })
    await acceptYouTubeConsent(this.page)
    if (this.page.url().includes('consent')) {
      await this.page.waitForTimeout(1500)
      await acceptYouTubeConsent(this.page)
    }
    await this.page.waitForSelector(MOVIE_PLAYER, { state: 'attached', timeout: 10000 })
  }

  async enterFullscreen(options?: { timeout?: number }) {
    const timeout = options?.timeout ?? TIMEOUT.FULLSCREEN
    await this.page.locator(MOVIE_PLAYER).hover()
    await this.page.click(FULLSCREEN_BUTTON)
    await this.page.waitForFunction(() => document.fullscreenElement !== null, { timeout })
  }

  async exitFullscreen(options?: { timeout?: number }) {
    const timeout = options?.timeout ?? TIMEOUT.FULLSCREEN
    await this.page.locator(MOVIE_PLAYER).hover()
    await this.page.click(FULLSCREEN_BUTTON)
    await this.page
      .waitForFunction(() => document.fullscreenElement === null, { timeout })
      .then(
        () => true,
        () => false,
      )
  }

  async waitForNativeChat(options?: { timeout?: number }) {
    const timeout = options?.timeout ?? TIMEOUT.NATIVE_CHAT_FRAME
    return this.page.waitForSelector(NATIVE_CHAT_FRAME, { state: 'attached', timeout }).then(
      () => true,
      () => false,
    )
  }

  async isLiveNow() {
    return this.page.evaluate(() => window.__ylcHelpers.isLiveNow()).then(Boolean, () => false)
  }

  async ensureFullscreen(options?: { timeout?: number }): Promise<boolean> {
    if (await this.isInFullscreen()) return true
    try {
      await this.enterFullscreen(options)
      return true
    } catch {
      return false
    }
  }

  async isInFullscreen() {
    return this.page.evaluate(() => document.fullscreenElement !== null)
  }
}
