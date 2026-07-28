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

  getAppliedFontSize() {
    return this.page.evaluate(() => {
      const iframe = window.__ylcHelpers.getExtensionIframe()
      return iframe?.contentDocument?.documentElement.style.getPropertyValue('--extension-yt-live-chat-font-size') ?? null
    })
  }

  async installChatOnlyGeometryProbe() {
    await this.page.evaluate(() => {
      const iframe = window.__ylcHelpers.getExtensionIframe()
      const document = iframe?.contentDocument
      if (!iframe || !document?.head || !document.body) throw new Error('Extension chat document is unavailable.')

      const style = document.createElement('style')
      style.dataset.ylcGeometryProbe = 'true'
      style.textContent = `
        yt-live-chat-renderer { display: block; position: relative; width: 100%; height: 100%; }
        #input-panel { height: 64px; }
        [data-ylc-reaction-probe] { position: absolute; right: 16px; bottom: 16px; width: 44px; height: 44px; }
        [data-ylc-popover-probe] { position: absolute; left: 20px; top: 48px; width: 180px; height: 96px; }
      `
      document.head.append(style)
      document.body.innerHTML = `
        <yt-live-chat-renderer>
          <yt-live-chat-header-renderer style="display: block">
            <button type="button" data-ylc-header-button>Chat menu</button>
            <div data-ylc-popover-probe>Chat menu popover</div>
          </yt-live-chat-header-renderer>
          <div id="ticker"><yt-live-chat-ticker-renderer>Super Chat</yt-live-chat-ticker-renderer></div>
          <yt-live-chat-item-list-renderer>Messages</yt-live-chat-item-list-renderer>
          <div id="input-panel"><yt-live-chat-message-input-renderer>Say something</yt-live-chat-message-input-renderer></div>
          <yt-reaction-control-panel-view-model data-ylc-reaction-probe>
            <button type="button">React</button>
          </yt-reaction-control-panel-view-model>
        </yt-live-chat-renderer>
      `
    })
  }

  getChatOnlyGeometryState() {
    return this.page.evaluate(() => {
      const iframe = window.__ylcHelpers.getExtensionIframe()
      const document = iframe?.contentDocument
      const overlayRoot = window.document.getElementById('shadow-root-live-chat')?.shadowRoot
      const viewport = overlayRoot?.querySelector<HTMLElement>('[data-ylc-chat-viewport]')
      const carrier = overlayRoot?.querySelector<HTMLElement>('[data-ylc-iframe-carrier]')
      const header = document?.querySelector<HTMLElement>('yt-live-chat-header-renderer')
      const input = document?.querySelector<HTMLElement>('#input-panel')
      const reaction = document?.querySelector<HTMLElement>('[data-ylc-reaction-probe]')
      const popover = document?.querySelector<HTMLElement>('[data-ylc-popover-probe]')
      if (!iframe || !document?.body || !viewport || !carrier || !header || !input || !reaction || !popover) {
        throw new Error('Chat-only geometry probe is incomplete.')
      }

      const rect = (element: Element) => {
        const bounds = element.getBoundingClientRect()
        return {
          left: bounds.left,
          top: bounds.top,
          right: bounds.right,
          bottom: bounds.bottom,
          width: bounds.width,
          height: bounds.height,
        }
      }
      const fullyInside = (inner: DOMRect, outer: DOMRect) =>
        inner.left >= outer.left && inner.top >= outer.top && inner.right <= outer.right && inner.bottom <= outer.bottom
      const isHit = (element: HTMLElement, x: number, y: number) => {
        const hit = document.elementFromPoint(x, y)
        return hit === element || (hit instanceof Node && element.contains(hit))
      }
      const centerHitTestVisible = (element: HTMLElement, bounds: DOMRect) =>
        isHit(element, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
      const cornerHitTestVisible = (element: HTMLElement, bounds: DOMRect) => {
        const inset = 4
        const points = [
          [bounds.left + inset, bounds.top + inset],
          [bounds.right - inset, bounds.top + inset],
          [bounds.left + inset, bounds.bottom - inset],
          [bounds.right - inset, bounds.bottom - inset],
        ] as const
        return points.every(([x, y]) => isHit(element, x, y))
      }
      const iframeRect = iframe.getBoundingClientRect()
      const viewportRect = viewport.getBoundingClientRect()
      const carrierRect = carrier.getBoundingClientRect()
      const documentViewport = new DOMRect(0, 0, iframe.contentWindow?.innerWidth ?? 0, iframe.contentWindow?.innerHeight ?? 0)
      const reactionRect = reaction.getBoundingClientRect()
      const popoverRect = popover.getBoundingClientRect()

      return {
        collapsed: document.body.classList.contains('chat-only-display'),
        header: rect(header),
        input: rect(input),
        iframe: rect(iframe),
        viewport: rect(viewport),
        carrier: rect(carrier),
        reaction: rect(reaction),
        popover: rect(popover),
        iframeMatchesViewport:
          Math.abs(iframeRect.left - viewportRect.left) < 1 &&
          Math.abs(iframeRect.top - viewportRect.top) < 1 &&
          Math.abs(iframeRect.width - viewportRect.width) < 1 &&
          Math.abs(iframeRect.height - viewportRect.height) < 1,
        carrierMatchesViewport:
          Math.abs(carrierRect.left - viewportRect.left) < 1 &&
          Math.abs(carrierRect.top - viewportRect.top) < 1 &&
          Math.abs(carrierRect.width - viewportRect.width) < 1 &&
          Math.abs(carrierRect.height - viewportRect.height) < 1,
        reactionFullyVisible: fullyInside(reactionRect, documentViewport),
        popoverFullyVisible: fullyInside(popoverRect, documentViewport),
        reactionHitTestVisible: centerHitTestVisible(reaction, reactionRect),
        popoverHitTestVisible: cornerHitTestVisible(popover, popoverRect),
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
