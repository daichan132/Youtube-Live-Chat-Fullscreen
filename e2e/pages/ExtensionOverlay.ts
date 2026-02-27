import { expect, type Page } from '@playwright/test'

import { TIMEOUT } from '../support/constants'
import { isExtensionArchiveChatPlayable, isExtensionChatLoaded } from '../support/diagnostics'
import { reliableClick } from '../utils/actions'
import { MOVIE_PLAYER, switchButtonSelector } from '../utils/selectors'

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
      await reliableClick(btn, this.page, switchButtonSelector)
    }
    await expect(btn).toHaveAttribute('aria-pressed', 'true', { timeout: TIMEOUT.SWITCH_ATTRIBUTE })
  }

  async toggleOff() {
    const btn = this.switchButton()
    const pressed = await btn.getAttribute('aria-pressed')
    if (pressed !== 'false') {
      await reliableClick(btn, this.page, switchButtonSelector)
    }
    await expect(btn).toHaveAttribute('aria-pressed', 'false', { timeout: TIMEOUT.SWITCH_ATTRIBUTE })
  }

  async ensureSwitchOff() {
    const btn = this.switchButton()
    if ((await btn.getAttribute('aria-pressed')) === 'true') {
      await reliableClick(btn, this.page, switchButtonSelector)
      await this.page.waitForTimeout(300)
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
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  return !root?.querySelector('iframe[data-ylc-chat="true"]')
}
