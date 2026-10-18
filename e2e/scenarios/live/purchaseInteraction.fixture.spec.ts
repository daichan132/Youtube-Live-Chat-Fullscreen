import { type Extension, expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { FrameLocator, Page } from '@playwright/test'
import type { ChatGeometryV2 } from '../../../shared/settings/model'
import { GEOMETRY_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const VIDEO_ID = 'ylc-native-purchase-ui'
const state = {
  video: { id: VIDEO_ID, title: 'Local native purchase interaction fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'live',
    purchaseInteractions: true,
    native: {
      state: 'playable',
      continuationVideoId: VIDEO_ID,
      slot: { beforeId: 'fixture-before', afterId: 'fixture-after' },
    },
    response: 'playable',
  },
} satisfies YouTubeScenarioState

const SMALL_GEOMETRY: ChatGeometryV2 = {
  reference: 'player',
  rect: { x: 100 / 1280, y: 80 / 720, width: 320 / 1280, height: 240 / 720 },
  pinned: true,
}

type PurchaseProbe = {
  supportEntries: number
  superChatEntries: number
  membershipEntries: number
  preventedEntries: number
  trustedEntries: number
  windowOpenCalls: number
  confirmations: number
}

const observePurchase = (page: Page) =>
  page
    .frameLocator('iframe[data-ylc-chat]')
    .locator('body')
    .evaluate(body => {
      const frame = body.ownerDocument.defaultView as unknown as Window & { __ylcFixturePurchase: PurchaseProbe }
      return { ...frame.__ylcFixturePurchase }
    })

const readGeometry = async (extension: Extension) => {
  const entries = await extension.storage.get([GEOMETRY_STORAGE_KEY])
  const stored = entries[GEOMETRY_STORAGE_KEY] as { value?: ChatGeometryV2 } | undefined
  return stored?.value ?? null
}

const initialize = async (page: Page, extension: Extension) => {
  await patchOverlayStore(extension, {
    geometry: SMALL_GEOMETRY,
    profile: { display: { contentMode: 'messages-only', idleVisibility: 'auto-hide' } },
  })
  const scenario = new YouTubeScenario(page)
  const overlay = new ExtensionOverlay(page)
  await scenario.load(state)
  await scenario.settleNativeIframeContext()
  await scenario.captureNativeIframeContext()
  await scenario.enterFullscreen()
  await overlay.expectChatLoaded({ timeout: 12000 })
  await expect.poll(() => overlay.getGeometry()).toMatchObject({ width: 320, height: 240 })
  return { scenario, overlay, chat: page.frameLocator('iframe[data-ylc-chat]') }
}

const expectSupportEntryWithinFrame = async (chat: FrameLocator) => {
  // Native app min-height used to leave this button at y=280 in a 240px iframe.
  // Assert the whole control is reachable before Playwright can scroll to it.
  await expect
    .poll(() =>
      chat.getByRole('button', { name: 'Open support menu' }).evaluate(button => {
        const rect = button.getBoundingClientRect()
        const viewport = button.ownerDocument.documentElement
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.x >= 0 &&
          rect.y >= 0 &&
          rect.right <= viewport.clientWidth &&
          rect.bottom <= viewport.clientHeight
        )
      }),
    )
    .toBe(true)
}

test.describe('native purchase presentation without transaction confirmation', { tag: ['@fixture', '@live'] }, () => {
  // These are deterministic native-like local handlers. They make no network
  // transaction and do not prove payment-provider or authenticated-account behavior.
  test('keeps a native offer usable in fullscreen through hover loss and restores the saved small layout', async ({ page, extension }) => {
    const { scenario, overlay, chat } = await initialize(page, extension)
    await overlay.frame().hover({ position: { x: 100, y: 100 } })
    await expectSupportEntryWithinFrame(chat)
    await chat.getByRole('button', { name: 'Open support menu' }).click()
    await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true)
    await expect.poll(() => overlay.getGeometry()).toMatchObject({ width: 360, height: 480 })
    await chat.getByRole('button', { name: 'Open Super Chat' }).click()
    await expect(chat.locator('yt-live-chat-message-buy-flow-renderer')).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true)
    await chat.getByRole('textbox', { name: 'Super Chat amount' }).fill('500')
    await chat.getByRole('textbox', { name: 'Super Chat draft' }).fill('hello, still a draft')

    // Wait beyond the real one-second idle timer after leaving the overlay.
    // The open native offer must not collapse, disappear, or blur its field.
    await page.mouse.move(1100, 600)
    await page.waitForTimeout(1400)
    await expect(overlay.chatViewport()).toHaveCSS('opacity', '1')
    await expect(chat.locator('body')).not.toHaveClass(/chat-only-display/)
    await expect(chat.getByRole('textbox', { name: 'Super Chat draft' })).toBeFocused()
    await expect(chat.getByRole('textbox', { name: 'Super Chat draft' })).toHaveValue('hello, still a draft')
    await expect(chat.getByRole('textbox', { name: 'Super Chat amount' })).toHaveValue('500')
    expect(await readGeometry(extension)).toEqual(SMALL_GEOMETRY)

    // The native selected panel, rather than the clipped outer surface, must
    // own scrolling. Scrolling to the confirm button never activates it.
    await expect.poll(() => chat.locator('#panel-pages').evaluate(panel => panel.scrollHeight > panel.clientHeight)).toBe(true)
    const confirm = chat.getByRole('button', { name: 'Confirm fixture purchase' })
    const outerScroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))
    await chat.locator('#panel-pages').hover()
    await page.mouse.wheel(0, 1200)
    await expect(confirm).toBeInViewport()
    await expect.poll(() => chat.locator('#panel-pages').evaluate(panel => panel.scrollTop)).toBeGreaterThan(0)
    expect(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))).toEqual(outerScroll)
    await page.mouse.wheel(0, -1600)
    await expect.poll(() => chat.locator('#panel-pages').evaluate(panel => panel.scrollTop)).toBe(0)
    await expect(chat.getByRole('button', { name: 'Close Super Chat' })).toBeInViewport()
    expect(await observePurchase(page)).toMatchObject({
      supportEntries: 1,
      superChatEntries: 1,
      membershipEntries: 0,
      preventedEntries: 0,
      trustedEntries: 2,
      windowOpenCalls: 0,
      confirmations: 0,
    })

    if (await page.evaluate(() => 'moveBefore' in Element.prototype)) {
      await scenario.exitFullscreen()
      await overlay.expectOverlayRemoved({ timeout: 12000 })
      await scenario.settleNativeIframeContext()
      expect(await scenario.observeNativeIframeContext()).toMatchObject({ sameDocument: true, sameRuntimeObject: true, loadEvents: 0 })
      await scenario.enterFullscreen()
      await overlay.expectChatLoaded({ timeout: 12000 })
      await expect(chat.getByRole('textbox', { name: 'Super Chat draft' })).toHaveValue('hello, still a draft')
      await expect(chat.getByRole('textbox', { name: 'Super Chat amount' })).toHaveValue('500')
      await expect.poll(() => overlay.getGeometry()).toMatchObject({ width: 360, height: 480 })
    } else {
      test.info().annotations.push({ type: 'context-preservation', description: 'This browser lacks state-preserving Element.moveBefore.' })
    }

    await chat.getByRole('button', { name: 'Close Super Chat' }).click()
    await expect.poll(() => overlay.getGeometry()).toMatchObject({ x: 100, y: 80, width: 320, height: 240 })
    expect(await readGeometry(extension)).toEqual(SMALL_GEOMETRY)
    expect(await observePurchase(page)).toMatchObject({ confirmations: 0, preventedEntries: 0, windowOpenCalls: 0 })
    await page.mouse.move(1100, 600)
    await expect(chat.locator('body')).not.toHaveClass(/chat-only-display/)
    await expect(overlay.chatViewport()).toHaveCSS('opacity', '0', { timeout: 4000 })
  })

  test('holds messages-only chrome open during a native offer and collapses after closing it', async ({ page, extension }) => {
    const { overlay, chat } = await initialize(page, extension)
    await patchOverlayStore(extension, { profile: { display: { contentMode: 'messages-only', idleVisibility: 'always-visible' } } })
    await page.mouse.move(1100, 600)
    await expect(chat.locator('body')).toHaveClass(/chat-only-display/)
    await overlay.frame().hover({ position: { x: 100, y: 100 } })
    await expectSupportEntryWithinFrame(chat)
    await chat.getByRole('button', { name: 'Open support menu' }).click()
    await chat.getByRole('button', { name: 'Open Super Chat' }).click()
    await chat.getByRole('textbox', { name: 'Super Chat draft' }).fill('hello')
    await page.mouse.move(1100, 600)
    await page.waitForTimeout(1400)
    await expect(chat.locator('body')).not.toHaveClass(/chat-only-display/)
    await expect(chat.getByRole('textbox', { name: 'Super Chat draft' })).toBeFocused()
    await expect(chat.getByRole('textbox', { name: 'Super Chat draft' })).toHaveValue('hello')
    await expect(overlay.chatViewport()).toHaveCSS('opacity', '1')
    await chat.getByRole('button', { name: 'Close Super Chat' }).click()
    await page.mouse.move(1100, 600)
    await expect(chat.locator('body')).toHaveClass(/chat-only-display/)
    await expect(overlay.chatViewport()).toHaveCSS('opacity', '1')
    expect(await observePurchase(page)).toMatchObject({ confirmations: 0, preventedEntries: 0, windowOpenCalls: 0 })
  })

  test('keeps ordinary and pinned links readable across palettes and scrolls chat without moving the outer page', async ({
    page,
    extension,
  }) => {
    const { overlay, chat } = await initialize(page, extension)
    await patchOverlayStore(extension, { profile: { display: { contentMode: 'full-chat', idleVisibility: 'always-visible' } } })
    await overlay.frame().hover({ position: { x: 100, y: 100 } })
    await expectSupportEntryWithinFrame(chat)
    const palettes = [
      { backgroundColor: { r: 255, g: 255, b: 255, a: 1 }, fontColor: { r: 15, g: 15, b: 15, a: 1 }, linkColor: 'rgb(3, 66, 148)' },
      { backgroundColor: { r: 12, g: 16, b: 24, a: 0.94 }, fontColor: { r: 245, g: 240, b: 230, a: 1 }, linkColor: 'rgb(151, 204, 255)' },
      { backgroundColor: { r: 249, g: 228, b: 194, a: 0.8 }, fontColor: { r: 42, g: 55, b: 76, a: 1 }, linkColor: 'rgb(3, 66, 148)' },
      { backgroundColor: { r: 48, g: 30, b: 72, a: 0.82 }, fontColor: { r: 247, g: 231, b: 255, a: 1 }, linkColor: 'rgb(151, 204, 255)' },
      { backgroundColor: { r: 0, g: 0, b: 0, a: 0 }, fontColor: { r: 255, g: 255, b: 255, a: 1 }, linkColor: 'rgb(151, 204, 255)' },
      { backgroundColor: { r: 128, g: 128, b: 128, a: 1 }, fontColor: { r: 15, g: 15, b: 15, a: 1 }, linkColor: 'rgb(0, 0, 16)' },
    ]
    for (const { linkColor, ...appearance } of palettes) {
      await patchOverlayStore(extension, { profile: { appearance } })
      for (const id of ['fixture-chat-link', 'fixture-pinned-link']) {
        const link = chat.locator(`#${id}`)
        await expect(link).toHaveCSS('text-decoration-line', 'underline')
        await expect(link).toHaveCSS('color', linkColor)
      }
      const { r, g, b } = appearance.backgroundColor
      const colour = await chat.locator('#fixture-chat-link').evaluate(element => {
        const style = element.ownerDocument.defaultView?.getComputedStyle(element)
        return (
          style?.color
            .match(/[\d.]+/g)
            ?.slice(0, 3)
            .map(Number) ?? []
        )
      })
      expect(colour).toHaveLength(3)
      // Opaque and near-opaque palettes guarantee the configured panel backdrop.
      // Transparent video backgrounds cannot promise a fixed contrast ratio.
      if (appearance.backgroundColor.a >= 0.8) {
        const luminance = (rgb: number[]) =>
          rgb
            .map(value => value / 255)
            .map(value => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
            .reduce((sum, value, index) => sum + value * ([0.2126, 0.7152, 0.0722][index] ?? 0), 0)
        const foreground = luminance(colour)
        for (const videoChannel of [0, 255]) {
          const background = luminance(
            [r, g, b].map(channel => channel * appearance.backgroundColor.a + videoChannel * (1 - appearance.backgroundColor.a)),
          )
          expect((Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)).toBeGreaterThanOrEqual(4.5)
        }
      }
      await expect(chat.locator('#fixture-button-link')).toHaveCSS('color', 'rgb(241, 241, 241)')
    }
    await expect(chat.locator('#fixture-chat-link')).toHaveAttribute('href', 'https://example.invalid/chat')
    await expect(chat.locator('#fixture-pinned-link')).toHaveAttribute('href', 'https://example.invalid/pinned')
    const scroller = chat.locator('#item-scroller')
    await expect.poll(() => scroller.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    const outerScroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))
    await scroller.hover()
    await page.mouse.wheel(0, 1200)
    await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
    expect(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))).toEqual(outerScroll)
    await page.mouse.wheel(0, -1600)
    await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBe(0)
    expect(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))).toEqual(outerScroll)
    expect(await observePurchase(page)).toMatchObject({ supportEntries: 0, confirmations: 0 })
  })

  test('lets the original membership click reach its native handler once without opening a replacement tab', async ({
    page,
    extension,
  }) => {
    const { overlay, chat } = await initialize(page, extension)
    const pageCount = page.context().pages().length
    await overlay.frame().hover({ position: { x: 100, y: 100 } })
    await expectSupportEntryWithinFrame(chat)
    await chat.getByRole('button', { name: 'Open support menu' }).click()
    await chat.getByRole('button', { name: 'Open membership' }).click()
    await expect(chat.getByRole('dialog', { name: 'Native membership dialog' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true)
    expect(page.context().pages().length).toBe(pageCount)
    await expect
      .poll(() => observePurchase(page))
      .toEqual({
        supportEntries: 1,
        superChatEntries: 0,
        membershipEntries: 1,
        preventedEntries: 0,
        trustedEntries: 2,
        windowOpenCalls: 0,
        confirmations: 0,
      })
    await chat.getByRole('button', { name: 'Close membership' }).click()
    await expect(chat.getByRole('dialog', { name: 'Native membership dialog' })).not.toBeVisible()
    await expect.poll(() => overlay.getGeometry()).toMatchObject({ width: 320, height: 240 })
    expect(await observePurchase(page)).toMatchObject({ membershipEntries: 1, confirmations: 0, windowOpenCalls: 0 })
  })
})
