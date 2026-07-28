import { TIMEOUT } from '@e2e/support/constants'
import { isExtensionArchiveChatPlayable, isExtensionChatLoaded } from '@e2e/support/diagnostics'
import { reliableClick } from '@e2e/utils/actions'
import { MOVIE_PLAYER, SHADOW_HOST, switchButtonSelector } from '@e2e/utils/selectors'
import { expect, type Locator, type Page } from '@playwright/test'

export class ExtensionOverlay {
  constructor(private page: Page) {}

  frame() {
    return this.page.locator(`${SHADOW_HOST} [data-ylc-resizable]`)
  }

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

  async getGeometry() {
    return this.frame().evaluate(element => {
      const rect = element.getBoundingClientRect()
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }
    })
  }

  getResizeDirections() {
    return this.frame()
      .locator('[data-ylc-resize-direction]')
      .evaluateAll(elements => elements.map(element => element.getAttribute('data-ylc-resize-direction')))
  }

  async revealControls() {
    await this.frame().hover({ force: true })
    await expect(this.dragHandle()).toBeVisible()
    await expect(this.dragHandle()).toBeEnabled()
  }

  async startDrag(delta: { x: number; y: number }) {
    await this.revealControls()
    await this.startPointerGesture(this.dragHandle(), delta)
  }

  async startResize(direction: string, delta: { x: number; y: number }) {
    await this.startPointerGesture(this.frame().locator(`[data-ylc-resize-direction="${direction}"]`), delta)
  }

  finishPointerGesture() {
    return this.page.mouse.up()
  }

  async moveWithKeyboard(key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') {
    await this.revealControls()
    await this.dragHandle().press(key)
  }

  async clickPlayerBoundaryProbe() {
    await this.page.getByRole('button', { name: 'Player boundary probe' }).click()
  }

  boundaryProbeClicks() {
    return this.page
      .getByRole('button', { name: 'Player boundary probe' })
      .getAttribute('data-ylc-clicks')
      .then(value => Number(value ?? 0))
  }

  private dragHandle() {
    return this.page.getByRole('button', { name: 'Drag to move' })
  }

  private async startPointerGesture(target: Locator, delta: { x: number; y: number }) {
    const box = await target.boundingBox()
    if (!box) throw new Error('Overlay interaction target has no browser bounding box.')
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    await this.page.mouse.move(start.x, start.y)
    await this.page.mouse.down()
    await this.page.mouse.move(start.x + delta.x, start.y + delta.y)
  }
}

const isExtensionChatDetached = () => {
  return !window.__ylcHelpers.getExtensionIframe()
}
