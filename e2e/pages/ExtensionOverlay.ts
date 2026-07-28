import { TIMEOUT } from '@e2e/support/constants'
import { isExtensionArchiveChatPlayable, isExtensionChatLoaded } from '@e2e/support/diagnostics'
import { reliableClick } from '@e2e/utils/actions'
import { MOVIE_PLAYER, SHADOW_HOST, switchButtonSelector } from '@e2e/utils/selectors'
import { expect, type Page } from '@playwright/test'

export class ExtensionOverlay {
  constructor(private page: Page) {}

  switchButton() {
    return this.page.locator(switchButtonSelector)
  }

  async expectSwitchReady(options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? TIMEOUT.SWITCH_VISIBLE
    // A playing video (and especially an ad transition) can keep the player
    // bounding box "unstable" indefinitely. Revealing controls does not need
    // Playwright's stability wait, so keep this action bounded.
    await this.page.locator(MOVIE_PLAYER).hover({ force: true, timeout: 5000 })
    await expect(this.switchButton()).toBeVisible({ timeout })
  }

  async toggleOn() {
    const btn = this.switchButton()
    const pressed = await btn.getAttribute('aria-pressed')
    if (pressed !== 'true') {
      await reliableClick(btn, async () => (await btn.getAttribute('aria-pressed')) === 'true')
    }
    await expect(btn).toHaveAttribute('aria-pressed', 'true', { timeout: TIMEOUT.SWITCH_ATTRIBUTE })
  }

  async toggleOff() {
    const btn = this.switchButton()
    const pressed = await btn.getAttribute('aria-pressed')
    if (pressed !== 'false') {
      await reliableClick(btn, async () => (await btn.getAttribute('aria-pressed')) === 'false')
    }
    await expect(btn).toHaveAttribute('aria-pressed', 'false', { timeout: TIMEOUT.SWITCH_ATTRIBUTE })
  }

  async expectSwitchOff(): Promise<void> {
    const btn = this.switchButton()
    if ((await btn.getAttribute('aria-pressed')) === 'true') {
      await reliableClick(btn, async () => (await btn.getAttribute('aria-pressed')) === 'false')
    }
    await expect(btn).toHaveAttribute('aria-pressed', 'false', { timeout: TIMEOUT.SWITCH_ATTRIBUTE })
  }

  async expectChatLoaded(options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? TIMEOUT.EXTENSION_CHAT
    await expect.poll(async () => this.page.evaluate(isExtensionChatLoaded), { timeout }).toBe(true)
  }

  async expectArchiveChatPlayable(options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? TIMEOUT.ARCHIVE_CHAT
    await expect.poll(async () => this.page.evaluate(isExtensionArchiveChatPlayable), { timeout }).toBe(true)
  }

  async expectChatDetached(options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? TIMEOUT.EXTENSION_CHAT
    await expect.poll(async () => this.page.evaluate(isExtensionChatDetached), { timeout }).toBe(true)
  }

  async expectOverlayRemoved(options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? TIMEOUT.EXTENSION_CHAT
    await expect.poll(async () => this.page.locator(SHADOW_HOST).count(), { timeout }).toBe(0)
  }

  async getHostCompositingState() {
    return this.page.locator(SHADOW_HOST).evaluate((host, playerSelector) => {
      const hostElement = host as HTMLElement
      const player = document.querySelector(playerSelector) as HTMLElement | null
      const hostStyle = window.getComputedStyle(hostElement)
      const hostRect = hostElement.getBoundingClientRect()
      const playerRect = player?.getBoundingClientRect() ?? null

      return {
        width: hostRect.width,
        height: hostRect.height,
        matchesPlayer:
          playerRect !== null &&
          Math.abs(hostRect.left - playerRect.left) < 1 &&
          Math.abs(hostRect.top - playerRect.top) < 1 &&
          Math.abs(hostRect.width - playerRect.width) < 1 &&
          Math.abs(hostRect.height - playerRect.height) < 1,
        zIndex: hostStyle.zIndex,
        isolation: hostStyle.isolation,
        transform: hostStyle.transform,
        pointerEvents: hostStyle.pointerEvents,
      }
    }, MOVIE_PLAYER)
  }
}

const isExtensionChatDetached = () => {
  return !window.__ylcHelpers.getExtensionIframe()
}
