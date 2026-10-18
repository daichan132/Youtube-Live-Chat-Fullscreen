import { type Extension, expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { FrameLocator, Locator, Page } from '@playwright/test'
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
type JewelsProbe = {
  entries: number
  trustedEntries: number
  preventedEntries: number
  selections: number
  checkout: number
}

const observeJewels = (chat: FrameLocator) =>
  chat.locator('body').evaluate(body => {
    const frame = body.ownerDocument.defaultView as unknown as Window & { __ylcFixtureJewels: JewelsProbe }
    return { ...frame.__ylcFixtureJewels }
  })

const expectWithinChatViewport = async (locator: Locator) => {
  await expect
    .poll(() =>
      locator.evaluate(element => {
        const rect = element.getBoundingClientRect()
        const viewport = element.ownerDocument.documentElement
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
        const doc = button.ownerDocument
        const viewport = doc.documentElement
        const withinViewport =
          rect.width > 0 &&
          rect.height > 0 &&
          rect.x >= 0 &&
          rect.y >= 0 &&
          rect.right <= viewport.clientWidth &&
          rect.bottom <= viewport.clientHeight
        if (!withinViewport) return false
        const iframe = doc.defaultView?.frameElement as HTMLIFrameElement | null
        if (!iframe) throw new Error('The same-origin fixture chat iframe must be accessible')
        const parentDoc = iframe.ownerDocument
        const frameRect = iframe.getBoundingClientRect()
        if (!iframe.offsetWidth || !iframe.offsetHeight) return false
        const scaleX = frameRect.width / iframe.offsetWidth
        const scaleY = frameRect.height / iframe.offsetHeight
        // Check the full button area before trusted input, including its lower
        // edge where a viewport-clamped rail or hover bridge could cover it.
        const insetX = Math.min(3, rect.width / 4)
        const insetY = Math.min(3, rect.height / 4)
        for (const x of [rect.left + insetX, rect.left + rect.width / 2, rect.right - insetX]) {
          for (const y of [rect.top + insetY, rect.top + rect.height / 2, rect.bottom - insetY]) {
            const parentX = frameRect.left + (iframe.clientLeft + x) * scaleX
            const parentY = frameRect.top + (iframe.clientTop + y) * scaleY
            let parentHit = parentDoc.elementFromPoint(parentX, parentY)
            while (parentHit?.shadowRoot) {
              const childHit = parentHit.shadowRoot.elementFromPoint(parentX, parentY)
              if (!childHit || childHit === parentHit) break
              parentHit = childHit
            }
            const childHit = doc.elementFromPoint(x, y)
            if (parentHit !== iframe || !childHit || !button.contains(childHit)) return false
          }
        }
        return true
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

  test('rebinds purchase activity when the native document replaces its body without loading', async ({ page, extension }, testInfo) => {
    const { overlay, chat } = await initialize(page, extension)
    await patchOverlayStore(extension, { profile: { display: { contentMode: 'full-chat', idleVisibility: 'always-visible' } } })
    await overlay.frame().hover({ position: { x: 100, y: 100 } })
    await expectSupportEntryWithinFrame(chat)

    // Replace only the body, keeping native nodes and their handlers intact.
    // The fixture changes its native offer state in the same update, without
    // navigation or a load event that could otherwise conceal a stale observer.
    await chat.locator('body').evaluate(body => {
      const document = body.ownerDocument
      const replacement = body.cloneNode(false) as HTMLElement
      replacement.append(...body.childNodes)
      body.replaceWith(replacement)
      replacement.querySelector('yt-live-chat-message-input-renderer')?.setAttribute('product-picker-open', '')
      const picker = replacement.querySelector<HTMLElement>('yt-live-chat-product-picker-panel-view-model')
      if (!picker) throw new Error('Expected the native product picker')
      picker.hidden = false
      picker.classList.add('iron-selected')
      const probe = document.defaultView as Window & { __purchaseBodyProbe?: { document: Document; loads: number; oldBody: HTMLElement } }
      probe.__purchaseBodyProbe = { document, loads: 0, oldBody: body as HTMLElement }
      probe.addEventListener('load', () => {
        if (probe.__purchaseBodyProbe) probe.__purchaseBodyProbe.loads += 1
      })
    })
    await expect.poll(() => overlay.getGeometry()).toMatchObject({ width: 360, height: 480 })
    await expect(chat.locator('body')).toHaveClass(/ylc-native-purchase-active/)
    await expect(page.locator('[data-ylc-control-rail]')).toHaveCount(0)
    await chat.getByRole('button', { name: 'Open Super Chat' }).click()
    await chat.getByRole('textbox', { name: 'Super Chat draft' }).fill('hello, still unsent')
    await expect(chat.getByRole('textbox', { name: 'Super Chat draft' })).toBeFocused()
    await chat.getByRole('button', { name: 'Close Super Chat' }).click()
    await expect.poll(() => overlay.getGeometry()).toMatchObject({ width: 320, height: 240 })
    await expect(chat.locator('body')).not.toHaveClass(/ylc-native-purchase-active/)

    await chat.getByRole('button', { name: 'Open support menu' }).click()
    await chat.getByRole('button', { name: 'Open Super Chat' }).click()
    await expect.poll(() => overlay.getGeometry()).toMatchObject({ width: 360, height: 480 })
    await chat.locator('body').evaluate(body => {
      const replacement = body.cloneNode(false) as HTMLElement
      replacement.append(...body.childNodes)
      body.replaceWith(replacement)
      replacement.querySelector('yt-live-chat-message-input-renderer')?.removeAttribute('product-picker-open')
      for (const selector of ['yt-live-chat-product-picker-panel-view-model', 'yt-live-chat-message-buy-flow-renderer', '#buy-flow']) {
        const panel = replacement.querySelector<HTMLElement>(selector)
        if (!panel) throw new Error('Expected a retained native purchase panel')
        panel.hidden = true
        panel.classList.remove('iron-selected')
      }
      const messages = replacement.querySelector<HTMLElement>('#fixture-messages')
      if (!messages) throw new Error('Expected the ordinary native messages page')
      messages.hidden = true
      messages.classList.remove('iron-selected')
      const loading = body.ownerDocument.createElement('div')
      loading.id = 'loading'
      loading.className = 'yt-live-chat-renderer iron-selected'
      loading.style.minHeight = '40px'
      loading.textContent = 'Loading the unfinished native offer'
      replacement.querySelector('#panel-pages')?.append(loading)
    })
    await expect.poll(() => overlay.getGeometry()).toMatchObject({ width: 360, height: 480 })
    await expect(chat.locator('body')).toHaveClass(/ylc-native-purchase-active/)
    await page.mouse.move(1100, 600)
    await page.waitForTimeout(1400)
    await expect(overlay.chatViewport()).toHaveCSS('opacity', '1')
    await expect(page.locator('[data-ylc-control-rail]')).toHaveCount(0)
    await chat.locator('body').evaluate(body => {
      const loading = body.querySelector<HTMLElement>('#loading')
      const messages = body.querySelector<HTMLElement>('#fixture-messages')
      if (!loading || !messages) throw new Error('Expected the native loading and messages pages')
      loading.hidden = true
      messages.hidden = false
      messages.classList.add('iron-selected')
      const probe = body.ownerDocument.defaultView as unknown as Window & { __purchaseBodyProbe: { oldBody: HTMLElement } }
      // An abandoned body's later mutations must not reopen the current flow.
      const abandonedInput = body.ownerDocument.createElement('yt-live-chat-message-input-renderer')
      abandonedInput.setAttribute('product-picker-open', '')
      probe.__purchaseBodyProbe.oldBody.append(abandonedInput)
    })
    await expect.poll(() => overlay.getGeometry()).toMatchObject({ x: 100, y: 80, width: 320, height: 240 })
    await expect(chat.locator('body')).not.toHaveClass(/ylc-native-purchase-active/)
    await expect(page.locator('[data-ylc-control-rail]')).toHaveCount(1)
    expect(
      await chat.locator('body').evaluate(body => {
        const probe = body.ownerDocument.defaultView as unknown as Window & { __purchaseBodyProbe: { document: Document; loads: number } }
        return { sameDocument: probe.__purchaseBodyProbe.document === body.ownerDocument, loads: probe.__purchaseBodyProbe.loads }
      }),
    ).toEqual({ sameDocument: true, loads: 0 })
    expect(await readGeometry(extension)).toEqual(SMALL_GEOMETRY)
    expect(await observePurchase(page)).toMatchObject({ confirmations: 0, preventedEntries: 0, windowOpenCalls: 0, trustedEntries: 3 })
    await testInfo.attach('body-replacement-restored-layout', { body: await page.screenshot(), contentType: 'image/png' })
  })

  for (const palette of [
    {
      name: 'dark-transparent',
      backgroundColor: { r: 12, g: 16, b: 24, a: 0.8 },
      fontColor: { r: 245, g: 240, b: 230, a: 1 },
      foreground: 'rgb(245, 240, 230)',
    },
    {
      name: 'light-transparent',
      backgroundColor: { r: 249, g: 247, b: 243, a: 0.85 },
      fontColor: { r: 15, g: 15, b: 15, a: 1 },
      foreground: 'rgb(15, 15, 15)',
    },
  ]) {
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 400, height: 300 },
      { width: 320, height: 240 },
    ]) {
      test(`keeps Buy Jewels usable in ${palette.name} at ${viewport.width}x${viewport.height} without checkout`, async ({
        page,
        extension,
      }, testInfo) => {
        const previousViewport = page.viewportSize() ?? { width: 1280, height: 720 }
        await page.setViewportSize(viewport)
        try {
          const savedGeometry: ChatGeometryV2 = {
            reference: 'player',
            rect: {
              x: 10 / viewport.width,
              y: 10 / viewport.height,
              width: Math.min(320, Math.max(240, viewport.width / 2)) / viewport.width,
              height: Math.min(240, Math.max(200, viewport.height * 0.6)) / viewport.height,
            },
            pinned: true,
          }
          await patchOverlayStore(extension, {
            geometry: savedGeometry,
            profile: {
              appearance: { backgroundColor: palette.backgroundColor, fontColor: palette.fontColor },
              display: { contentMode: 'full-chat', idleVisibility: 'auto-hide' },
            },
          })
          const scenario = new YouTubeScenario(page)
          const overlay = new ExtensionOverlay(page)
          await scenario.load(state)
          await scenario.settleNativeIframeContext()
          await scenario.enterFullscreen()
          await overlay.expectChatLoaded({ timeout: 12000 })
          const chat = page.frameLocator('iframe[data-ylc-chat]')
          const storedGeometry = await readGeometry(extension)
          const restingGeometry = await overlay.getGeometry()
          await overlay.frame().hover({ position: { x: 24, y: 24 } })
          await expectSupportEntryWithinFrame(chat)

          for (const selector of [
            '#author-name-v2',
            '#author-name-v2 > .ytAttributedStringHost > span',
            '#message-v2 > .ytAttributedStringHost',
          ]) {
            await expect(chat.locator(`yt-gift-message-view-model ${selector}`)).toHaveCSS('color', palette.foreground)
          }
          await expect(chat.locator('[data-gift-semantic]')).toHaveCSS('color', 'rgb(123, 62, 219)')
          await expect(chat.locator('[data-gift-art]')).toHaveCSS('fill', 'rgb(213, 158, 34)')

          await chat.getByRole('button', { name: 'Open support menu' }).click()
          await expectWithinChatViewport(chat.locator('yt-live-chat-product-picker-panel-view-model'))
          if (viewport.height === 720) {
            const gift = chat.locator('yt-gift-message-view-model')
            await expect(gift).toBeInViewport()
            await testInfo.attach('gift-announcement', { body: await gift.screenshot(), contentType: 'image/png' })
          }
          await chat.getByRole('button', { name: 'Open Buy Jewels' }).click()
          const panel = chat.locator('#fixture-jewels-page')
          const header = panel.locator('ytd-engagement-panel-title-header-renderer')
          const buy = chat.getByRole('button', { name: 'Buy fixture Jewels' })
          await expect(panel).toHaveClass(/iron-selected/)
          await expect(chat.locator('body')).toHaveClass(/ylc-native-purchase-active/)
          await expect(page.locator('[data-ylc-control-rail]')).toHaveCount(0)
          await expect(page.locator('[data-ylc-resize-direction]')).toHaveCount(0)
          await expect
            .poll(() => overlay.getGeometry())
            .toMatchObject({
              width: Math.min(viewport.width - 20, Math.max(360, restingGeometry.width)),
              height: Math.min(viewport.height - 20, Math.max(480, restingGeometry.height)),
            })
          expect(await readGeometry(extension)).toEqual(storedGeometry)
          await expect(chat.locator('yt-live-chat-message-input-renderer')).not.toHaveAttribute('product-picker-open', '')
          await expectWithinChatViewport(header)
          await expect(header.locator('#title-text')).toHaveCSS('color', palette.foreground)
          for (const id of ['navigation-button', 'information-button']) {
            await expect(header.locator(`#${id} button`)).toHaveCSS('color', palette.foreground)
            await expect(header.locator(`#${id} path`)).toHaveCSS('fill', palette.foreground)
          }
          await expect(panel.locator('.fixture-jewels-choice').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)')
          await expect(panel.locator('.fixture-jewels-choice span').first()).toHaveCSS('color', 'rgb(15, 15, 15)')
          await expect(buy).toHaveCSS('background-color', 'rgb(6, 95, 212)')
          await expect(buy).toHaveCSS('color', 'rgb(255, 255, 255)')
          await expect
            .poll(() =>
              panel.evaluate(element =>
                [element, ...element.querySelectorAll<HTMLElement>('.ytPdpViewModelColumnContainer, .ytPdpViewModelColumn')].every(
                  node => node.scrollWidth <= node.clientWidth,
                ),
              ),
            )
            .toBe(true)

          const outerScroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))
          await panel
            .locator('.ytPdpViewModelColumnContainer')
            .first()
            .hover({ position: { x: 24, y: 24 } })
          await page.mouse.wheel(0, 1400)
          const scroller = panel.locator(':scope > #content')
          await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
          const lastOption = chat.getByRole('radio', { name: 'Jewels package 8' })
          // The native terms/footer can fill a short viewport at the bottom.
          // Wheel back to the final option before selecting it; reaching the
          // bottom does not imply every nearby control is in the visible clip.
          const optionWheelDelta = await lastOption.evaluate(element => {
            const content = element.closest('ytd-engagement-panel-section-list-renderer')?.querySelector(':scope > #content')
            if (!content) throw new Error('Expected the native Jewels scroller')
            const clip = content.getBoundingClientRect()
            const rect = element.getBoundingClientRect()
            return rect.y + rect.height / 2 - (clip.y + clip.height / 2)
          })
          await page.mouse.wheel(0, optionWheelDelta)
          await expect
            .poll(() =>
              lastOption.evaluate(element => {
                const content = element.closest('ytd-engagement-panel-section-list-renderer')?.querySelector(':scope > #content')
                if (!content) return false
                const clip = content.getBoundingClientRect()
                const rect = element.getBoundingClientRect()
                return rect.y >= clip.y && rect.bottom <= clip.bottom
              }),
            )
            .toBe(true)
          await expectWithinChatViewport(lastOption)
          await lastOption.click()
          await expect(lastOption).toBeChecked()
          // Focus advances from the selected radio group to the native Buy
          // button. Never activate that button, even in this local fixture.
          await page.keyboard.press('Tab')
          await expect(buy).toBeFocused()
          await expectWithinChatViewport(buy)
          if (viewport.height === 300) {
            // Reproduce Firefox's native partial-visibility focus boundary:
            // leave Buy, wheel it 6px under the scrollport, then Tab back.
            await page.keyboard.press('Shift+Tab')
            await expect(lastOption).toBeFocused()
            await scroller.hover({ position: { x: 24, y: 24 } })
            const partialWheelDelta = await buy.evaluate(element => {
              const content = element.closest('ytd-engagement-panel-section-list-renderer')?.querySelector(':scope > #content')
              if (!content) throw new Error('Expected the native Jewels scroller')
              return element.getBoundingClientRect().bottom - (content.getBoundingClientRect().bottom + 6)
            })
            await page.mouse.wheel(0, partialWheelDelta)
            await expect
              .poll(() =>
                buy.evaluate(element => {
                  const content = element.closest('ytd-engagement-panel-section-list-renderer')?.querySelector(':scope > #content')
                  if (!content) return false
                  const clipped = element.getBoundingClientRect().bottom - content.getBoundingClientRect().bottom
                  return clipped > 4 && clipped < 8
                }),
              )
              .toBe(true)
            await page.keyboard.press('Tab')
            await expect(buy).toBeFocused()
            await expectWithinChatViewport(buy)
          }
          await expectWithinChatViewport(header)
          expect(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))).toEqual(outerScroll)
          expect(await observeJewels(chat)).toEqual({ entries: 1, trustedEntries: 1, preventedEntries: 0, selections: 1, checkout: 0 })
          expect(await observePurchase(page)).toMatchObject({ confirmations: 0, windowOpenCalls: 0, preventedEntries: 0 })
          await testInfo.attach('jewels-native-layout', { body: await page.screenshot(), contentType: 'image/png' })

          await chat.getByRole('button', { name: 'Close Buy Jewels' }).click()
          await expect(chat.locator('body')).not.toHaveClass(/ylc-native-purchase-active/)
          await expect.poll(() => overlay.getGeometry()).toEqual(restingGeometry)
          expect(await readGeometry(extension)).toEqual(storedGeometry)
          expect(await observeJewels(chat)).toMatchObject({ checkout: 0 })
          await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true)
        } finally {
          if (!page.isClosed()) {
            await page.setViewportSize(previousViewport).catch(error => {
              if (!page.isClosed()) throw error
            })
          }
        }
      })
    }
  }

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
