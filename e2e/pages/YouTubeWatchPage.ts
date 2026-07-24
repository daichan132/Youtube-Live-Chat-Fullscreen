import type { Page } from '@playwright/test'
import { TIMEOUT } from '@e2e/support/constants'
import { acceptYouTubeConsentWithRetry } from '@e2e/utils/liveUrl'
import { FULLSCREEN_BUTTON, MOVIE_PLAYER, NATIVE_CHAT_FRAME } from '@e2e/utils/selectors'

export class YouTubeWatchPage {
  constructor(private page: Page) {}

  async goto(url: string, options?: { timeout?: number }) {
    const timeout = options?.timeout ?? TIMEOUT.PAGE_GOTO
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout })
    await acceptYouTubeConsentWithRetry(this.page)
    await this.page.waitForSelector(MOVIE_PLAYER, { state: 'attached', timeout: 10000 })
  }

  async enterFullscreen(options?: { timeout?: number }) {
    const timeout = options?.timeout ?? TIMEOUT.FULLSCREEN
    await this.page.locator(MOVIE_PLAYER).hover()
    await this.page.click(FULLSCREEN_BUTTON)
    await this.page.waitForFunction(() => document.fullscreenElement !== null, { timeout })
  }

  async exitFullscreen(options?: { timeout?: number }): Promise<boolean> {
    const timeout = options?.timeout ?? TIMEOUT.FULLSCREEN
    await this.page.locator(MOVIE_PLAYER).hover()
    await this.page.click(FULLSCREEN_BUTTON)
    return this.page
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

  async getFullscreenNativeChatLayout() {
    return this.page.evaluate(() => {
      const player = document.querySelector('.html5-video-player.ytp-fullscreen') as HTMLElement | null
      const chatContainer = document.querySelector('#chat-container') as HTMLElement | null
      const playerRect = player?.getBoundingClientRect()
      const chatRect = chatContainer?.getBoundingClientRect()

      return {
        fullscreen: document.fullscreenElement !== null,
        playerWidth: playerRect?.width ?? 0,
        playerRight: playerRect?.right ?? 0,
        chatWidth: chatRect?.width ?? 0,
        chatLeft: chatRect?.left ?? 0,
        overlapPx: playerRect && chatRect ? Math.max(0, playerRect.right - chatRect.left) : Number.POSITIVE_INFINITY,
        hasExtensionLayoutFix: document.documentElement.classList.contains('ylc-fullscreen-chat-fix'),
        hasPlayerFootprintOverride:
          document.documentElement.classList.contains('ylc-fullscreen-player-footprint') ||
          document.getElementById('ylc-fullscreen-player-footprint') !== null,
      }
    })
  }
}
