import { TIMEOUT } from '@e2e/support/constants'
import { acceptYouTubeConsentWithRetry } from '@e2e/utils/liveUrl'
import { FULLSCREEN_BUTTON, MOVIE_PLAYER, NATIVE_CHAT_FRAME } from '@e2e/utils/selectors'
import { expect, type Page } from '@playwright/test'

export class YouTubeWatchPage {
  constructor(private page: Page) {}

  private async revealPlayerControls(timeout: number) {
    await this.page.locator(MOVIE_PLAYER).hover({ force: true, timeout: Math.min(timeout, 5000) })
  }

  async goto(url: string, options?: { timeout?: number }) {
    const timeout = options?.timeout ?? TIMEOUT.PAGE_GOTO
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout })
    await acceptYouTubeConsentWithRetry(this.page)
    await this.page.waitForSelector(MOVIE_PLAYER, { state: 'attached', timeout: 10000 })
  }

  async enterFullscreen(options?: { timeout?: number }) {
    const timeout = options?.timeout ?? TIMEOUT.FULLSCREEN
    const deadline = Date.now() + timeout
    const remainingTimeout = () => Math.max(1, deadline - Date.now())

    await this.revealPlayerControls(remainingTimeout())
    await this.page.click(FULLSCREEN_BUTTON, { timeout: remainingTimeout() })
    await this.page.waitForFunction(() => document.fullscreenElement !== null, undefined, {
      timeout: remainingTimeout(),
    })
  }

  async expectFullscreenExited(options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? TIMEOUT.FULLSCREEN
    const deadline = Date.now() + timeout
    const remainingTimeout = () => Math.max(1, deadline - Date.now())

    await this.revealPlayerControls(remainingTimeout())
    await this.page.click(FULLSCREEN_BUTTON, { timeout: remainingTimeout() })
    await expect.poll(async () => this.isInFullscreen(), { timeout: remainingTimeout() }).toBe(false)
  }

  async expectNativeChat(options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? TIMEOUT.NATIVE_CHAT_FRAME
    await expect(this.page.locator(NATIVE_CHAT_FRAME)).toBeAttached({ timeout })
  }

  async expectFullscreen(options?: { timeout?: number }): Promise<void> {
    if (!(await this.isInFullscreen())) await this.enterFullscreen(options)
    await expect.poll(async () => this.isInFullscreen(), { timeout: options?.timeout ?? TIMEOUT.FULLSCREEN }).toBe(true)
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
