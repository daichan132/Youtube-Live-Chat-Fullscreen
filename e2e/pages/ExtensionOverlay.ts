import { TIMEOUT } from '@e2e/support/constants'
import { isExtensionArchiveChatPlayable, isExtensionChatLoaded } from '@e2e/support/diagnostics'
import { reliableClick } from '@e2e/utils/actions'
import { MOVIE_PLAYER, switchButtonSelector } from '@e2e/utils/selectors'
import { expect, type Page } from '@playwright/test'

export class ExtensionOverlay {
  constructor(private page: Page) {}

  switchButton() {
    return this.page.locator(switchButtonSelector)
  }

  async waitForSwitchReady(options?: { timeout?: number }): Promise<boolean> {
    const timeout = options?.timeout ?? TIMEOUT.SWITCH_VISIBLE
    await this.page.locator(MOVIE_PLAYER).hover()
    return this.switchButton()
      .waitFor({ state: 'visible', timeout })
      .then(
        () => true,
        () => false,
      )
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

  /**
   * Ensure the switch is off.
   * Returns `'was-off'` if the switch was already off (iframe was never attached),
   * `'turned-off'` if it was toggled off successfully,
   * or `'failed'` if the toggle did not take effect.
   */
  async ensureSwitchOff(): Promise<'was-off' | 'turned-off' | 'failed'> {
    const btn = this.switchButton()
    if ((await btn.getAttribute('aria-pressed')) !== 'true') return 'was-off'
    try {
      await reliableClick(btn, async () => (await btn.getAttribute('aria-pressed')) === 'false')
      await expect(btn).toHaveAttribute('aria-pressed', 'false', { timeout: TIMEOUT.SWITCH_ATTRIBUTE })
      return 'turned-off'
    } catch {
      return 'failed'
    }
  }

  async waitForChatLoaded(options?: { timeout?: number }): Promise<boolean> {
    const timeout = options?.timeout ?? TIMEOUT.EXTENSION_CHAT
    try {
      await expect.poll(async () => this.page.evaluate(isExtensionChatLoaded), { timeout }).toBe(true)
      return true
    } catch {
      return false
    }
  }

  async waitForArchiveChatPlayable(options?: { timeout?: number }): Promise<boolean> {
    const timeout = options?.timeout ?? TIMEOUT.ARCHIVE_CHAT
    try {
      await expect.poll(async () => this.page.evaluate(isExtensionArchiveChatPlayable), { timeout }).toBe(true)
      return true
    } catch {
      return false
    }
  }

  async waitForChatDetached(options?: { timeout?: number }): Promise<boolean> {
    const timeout = options?.timeout ?? TIMEOUT.EXTENSION_CHAT
    try {
      await expect.poll(async () => this.page.evaluate(isExtensionChatDetached), { timeout }).toBe(true)
      return true
    } catch {
      return false
    }
  }
}

const isExtensionChatDetached = () => {
  return !window.__ylcHelpers.getExtensionIframe()
}
