import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { Locator, Page, TestInfo } from '@playwright/test'
import { GEOMETRY_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const state = {
  video: { id: 'ylc-standard-purchase-ui', title: 'Synthetic standard purchase UI', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'live',
    standardPurchaseInteractions: true,
    native: {
      state: 'playable',
      continuationVideoId: 'ylc-standard-purchase-ui',
      slot: { beforeId: 'fixture-before', afterId: 'fixture-after' },
    },
    response: 'playable',
  },
} satisfies YouTubeScenarioState
const palettes = [
  { name: 'dark', background: { r: 12, g: 16, b: 24, a: 0.94 }, foreground: { r: 245, g: 240, b: 230, a: 1 } },
  { name: 'light', background: { r: 245, g: 240, b: 230, a: 0.94 }, foreground: { r: 15, g: 23, b: 42, a: 1 } },
  { name: 'plum', background: { r: 35, g: 18, b: 48, a: 0.85 }, foreground: { r: 240, g: 180, b: 225, a: 1 } },
] as const
const kinds = ['Super Chat', 'Modern Super Chat', 'Super Stickers', 'Membership gifts', 'Membership', 'Donation'] as const
const withinViewport = (target: Locator) =>
  expect
    .poll(() =>
      target.evaluate(e => {
        const r = e.getBoundingClientRect()
        const d = e.ownerDocument.documentElement
        return r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.right <= d.clientWidth && r.bottom <= d.clientHeight
      }),
    )
    .toBe(true)
const withinPurchaseScrollport = (target: Locator) =>
  expect
    .poll(() =>
      target.evaluate(e => {
        const r = e.getBoundingClientRect()
        const p = e.closest('#panel-pages')?.getBoundingClientRect()
        return !!p && r.width > 0 && r.height > 0 && r.left >= p.left && r.top >= p.top && r.right <= p.right && r.bottom <= p.bottom
      }),
    )
    .toBe(true)
const paint = (target: Locator) =>
  target.evaluate(e => {
    const s = e.ownerDocument.defaultView?.getComputedStyle(e)
    return { color: s?.color, background: s?.backgroundColor }
  })
const capture = async (page: Page, info: TestInfo, name: string) =>
  info.attach(name, { body: await page.screenshot(), contentType: 'image/png' })
const wheelTo = async (page: Page, panel: Locator, delta: number) => {
  const rect = await panel.boundingBox()
  if (!rect) throw new Error('Native purchase scrollport is not rendered')
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
  // A continuous gesture avoids a single unrealistic 3,000px wheel impulse
  // rebounding around a focused native checkbox in Chrome (also without YLC).
  for (let tick = 0; tick < 10; tick++) {
    await page.mouse.wheel(0, delta / 10)
    await panel.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))
  }
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 400, height: 300 },
  { width: 320, height: 240 },
]) {
  for (const palette of palettes) {
    for (const kind of kinds) {
      test(`standard ${kind} stays usable in ${palette.name} at ${viewport.width}x${viewport.height}`, async ({
        page,
        extension,
      }, info) => {
        await page.setViewportSize(viewport)
        const geometry = {
          reference: 'player' as const,
          rect: {
            x: 10 / viewport.width,
            y: 10 / viewport.height,
            width: Math.min(0.65, 240 / viewport.width),
            height: 200 / viewport.height,
          },
          pinned: true,
        }
        await patchOverlayStore(extension, {
          geometry,
          profile: {
            appearance: { backgroundColor: palette.background, fontColor: palette.foreground, fontSize: 14 },
            display: { contentMode: 'messages-only', idleVisibility: 'auto-hide' },
          },
        })
        const scenario = new YouTubeScenario(page)
        const overlay = new ExtensionOverlay(page)
        await scenario.load(state)
        await scenario.settleNativeIframeContext()
        await scenario.captureNativeIframeContext()
        await scenario.enterFullscreen()
        await overlay.expectChatLoaded({ timeout: 12000 })
        const initial = await overlay.getGeometry()
        const chat = page.frameLocator('iframe[data-ylc-chat]')
        const panel = chat.locator('#panel-pages')
        const rgb = `${palette.foreground.r}, ${palette.foreground.g}, ${palette.foreground.b}`
        const primary = `rgb(${rgb})`
        const secondary = `rgba(${rgb}, 0.6)`
        await overlay.frame().hover()
        await chat.getByRole('button', { name: 'Support creator', exact: true }).click()
        const choice = chat.getByRole('button', { name: `Open ${kind}`, exact: true })
        await expect(choice.locator('yt-attributed-string').first()).toHaveCSS('color', primary)
        await expect(choice.locator('yt-attributed-string').last()).toHaveCSS('color', secondary)
        await choice.click()

        if (kind === 'Membership') {
          const dialog = chat.getByRole('dialog', { name: 'Native membership offer' })
          await withinViewport(dialog)
          expect(await paint(dialog)).toEqual({ color: 'rgb(15, 15, 15)', background: 'rgb(255, 255, 255)' })
          await capture(page, info, 'native-membership-unconfirmed')
          await chat.getByRole('button', { name: 'Close native membership', exact: true }).click()
        } else {
          await expect(chat.locator('body')).toHaveClass(/ylc-native-purchase-active/)
          await expect(chat.locator('body')).not.toHaveClass(/chat-only-display/)
          await expect(overlay.frame().locator('[data-ylc-control-rail]')).toHaveCount(0)
          const outerScroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }))

          if (kind === 'Super Chat' || kind === 'Modern Super Chat') {
            const flow = chat.locator('yt-live-chat-message-buy-flow-renderer')
            const amount = chat.getByRole('textbox', { name: kind === 'Super Chat' ? 'Legacy amount' : 'Modern amount', exact: true })
            const buy = chat.getByRole('button', { name: 'Confirm paid message', exact: true })
            await expect(flow.locator('#heading-title')).toHaveCSS('color', primary)
            await expect(amount).toHaveCSS('color', primary)
            await expect(flow.locator('#disclaimer-text')).toHaveCSS('color', secondary)
            await expect(flow.locator('#goal-disclaimer-container a')).toHaveCSS('text-decoration-line', 'underline')
            await expect(flow.locator('yt-live-chat-paid-message-renderer')).toHaveCSS('background-color', 'rgb(0, 90, 155)')
            const draft = chat.getByRole('textbox', { name: 'Paid message draft', exact: true })
            await expect(draft).toHaveCSS('color', 'rgb(255, 255, 255)')
            await capture(page, info, 'paid-message-header')
            await amount.fill('0')
            await expect(buy).toBeDisabled()
            await expect(flow.locator('#invalid-input-error')).toHaveCSS('color', 'rgb(200, 30, 40)')
            await amount.fill('500')
            await draft.fill('x'.repeat(51))
            await expect(buy).toBeDisabled()
            await expect(flow.locator('#revamped-characters')).toHaveCSS('color', 'rgb(200, 30, 40)')
            await draft.fill('hello, still a draft')
            await expect(buy).toBeEnabled()
            await expect(buy).toHaveCSS('background-color', 'rgb(6, 95, 212)')
            await expect(buy).toHaveCSS('color', 'rgb(255, 255, 255)')
            await page.mouse.move(viewport.width - 1, viewport.height - 1)
            await page.waitForTimeout(1200)
            await expect(overlay.chatViewport()).toHaveCSS('opacity', '1')
            await expect(draft).toHaveText('hello, still a draft')
            // Native focus scrolling, without activating Buy: amount -> slider -> terms -> Buy.
            await amount.click()
            await page.keyboard.press('Tab')
            await page.keyboard.press('Tab')
            await page.keyboard.press('Tab')
            await expect(buy).toBeFocused()
            await withinViewport(buy)
            await withinPurchaseScrollport(buy)
            await capture(page, info, 'paid-message-footer-focused-not-activated')
            await wheelTo(page, panel, -3000)
            await expect.poll(() => panel.evaluate(e => e.scrollTop)).toBe(0)
            await flow.getByRole('button', { name: 'Paid message help', exact: true }).click()
            const help = flow.locator('yt-live-chat-dialog-renderer #inner')
            await withinViewport(help)
            expect(await paint(help)).toEqual({ color: 'rgb(15, 15, 15)', background: 'rgb(255, 255, 255)' })
            await flow.getByRole('button', { name: 'Close paid message help', exact: true }).click()
            await flow.getByRole('button', { name: 'Close paid message', exact: true }).click()
          } else if (kind === 'Super Stickers') {
            const flow = chat.locator('yt-live-chat-paid-sticker-panel-renderer')
            await expect(flow.locator('#header-text h3')).toHaveCSS('color', primary)
            await expect(flow.locator('#header-text > span')).toHaveCSS('color', secondary)
            await expect(flow.getByRole('button', { name: 'Next sticker pack', exact: true }).locator('.ytSpecIconShapeHost')).toHaveCSS(
              'color',
              primary,
            )
            await flow.getByRole('button', { name: 'Next sticker pack', exact: true }).click()
            await expect(flow.getByRole('button', { name: 'Previous sticker pack', exact: true })).toBeDisabled()
            await expect(flow.locator('[data-sticker-art]').first()).toHaveCSS('color', 'rgb(213, 158, 34)')
            await expect(flow.locator('yt-live-chat-super-sticker-pack-item-button-renderer #price').first()).toHaveCSS(
              'background-color',
              'rgb(230, 230, 230)',
            )
            await wheelTo(page, panel, 3000)
            await expect.poll(() => panel.evaluate(e => e.scrollTop)).toBeGreaterThan(0)
            await withinViewport(flow.locator('yt-live-chat-super-sticker-pack-backstory-renderer'))
            await capture(page, info, 'sticker-catalog-bottom')
            await wheelTo(page, panel, -3000)
            await expect.poll(() => panel.evaluate(e => e.scrollTop)).toBe(0)
            await flow.getByRole('button', { name: 'Sticker 1', exact: true }).click()
            const preview = flow.locator('yt-live-chat-super-sticker-preview-renderer')
            await expect(preview.locator('h3')).toHaveCSS('color', primary)
            await expect(preview.locator('#header')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
            await expect(preview.locator('#right')).toHaveCSS('color', secondary)
            await expect(preview.locator('#back-button button')).toHaveCSS('color', primary)
            const buy = preview.getByRole('button', { name: 'Confirm sticker purchase', exact: true })
            await expect(buy).toHaveCSS('color', 'rgb(255, 255, 255)')
            await expect(buy).toHaveCSS('background-color', 'rgb(6, 95, 212)')
            await wheelTo(page, panel, 3000)
            await withinViewport(buy)
            await withinPurchaseScrollport(buy)
            await capture(page, info, 'sticker-preview-unconfirmed')
            await preview.getByRole('button', { name: 'Choose another sticker', exact: true }).click()
            await expect(flow.locator('#selection')).toBeVisible()
            await flow.getByRole('button', { name: 'Close sticker catalog', exact: true }).click()
          } else if (kind === 'Donation') {
            const flow = chat.locator('ytd-donation-amount-picker-renderer[live-chat]')
            expect(await paint(flow.locator(':scope > #container'))).toEqual({ color: 'rgb(15, 15, 15)', background: 'rgb(255, 255, 255)' })
            const amount = flow.getByRole('textbox', { name: 'Donation amount', exact: true })
            await amount.fill('300')
            await flow.getByRole('checkbox', { name: 'Anonymous donation', exact: true }).check()
            await page.mouse.move(viewport.width - 1, viewport.height - 1)
            await page.waitForTimeout(1200)
            await expect(overlay.chatViewport()).toHaveCSS('opacity', '1')
            await expect(amount).toHaveValue('300')
            await expect.poll(() => panel.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true)
            await wheelTo(page, panel, 3000)
            await withinViewport(flow.getByRole('button', { name: 'Confirm donation', exact: true }))
            await withinPurchaseScrollport(flow.getByRole('button', { name: 'Confirm donation', exact: true }))
            await capture(page, info, 'donation-unconfirmed')
            await wheelTo(page, panel, -3000)
            await expect.poll(() => panel.evaluate(e => e.scrollTop)).toBe(0)
            await flow.getByRole('button', { name: 'Close donation', exact: true }).click()
          } else {
            const flow = chat.locator('ytd-sponsorships-gift-offer-renderer')
            await expect(flow.locator('ytd-sponsorships-gift-offer-header-renderer #title')).toHaveCSS('color', primary)
            await expect(flow.locator('#subtitle')).toHaveCSS('color', secondary)
            await expect(flow.locator('.description').first()).toHaveCSS('color', secondary)
            const quantity = flow.getByRole('button', { name: 'Preview 100 membership gifts', exact: true })
            await expect(quantity).toHaveCSS('color', primary)
            await wheelTo(page, panel, 3000)
            await withinViewport(quantity)
            await withinPurchaseScrollport(quantity)
            await expect.poll(() => panel.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true)
            await expect(flow.getByRole('button', { name: 'Unavailable gift quantity', exact: true })).toBeDisabled()
            await capture(page, info, 'membership-gift-quantities')
            // Local quantity-preview handler only; no real checkout exists in this fixture.
            await quantity.click()
            await wheelTo(page, panel, -3000)
            await expect.poll(() => panel.evaluate(e => e.scrollTop)).toBe(0)
            await flow.getByRole('button', { name: 'Close gift offer', exact: true }).click()
          }
          expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(outerScroll)
        }
        await expect(chat.locator('body')).not.toHaveClass(/ylc-native-purchase-active/)
        await expect.poll(() => overlay.getGeometry()).toEqual(initial)
        const saved = (await extension.storage.get([GEOMETRY_STORAGE_KEY]))[GEOMETRY_STORAGE_KEY] as { value: unknown }
        expect(saved.value).toEqual(geometry)
        expect(await page.evaluate(() => document.fullscreenElement !== null)).toBe(true)
        const probe = await chat
          .locator('body')
          .evaluate(
            e =>
              (e.ownerDocument.defaultView as unknown as { __ylcFixtureStandardPurchase: Record<string, number> })
                .__ylcFixtureStandardPurchase,
          )
        expect(probe.confirmations).toBe(0)
        expect(probe.sends).toBe(0)
        expect(probe.preventedEntries).toBe(0)
        expect(probe.trustedEntries).toBe(probe.entries)
        await info.attach('safe-native-handler-counts', { body: JSON.stringify(probe), contentType: 'application/json' })
      })
    }
  }
}
