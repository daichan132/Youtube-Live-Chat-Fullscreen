import { E2E_BRIDGE_FILE } from '@e2e/config/buildOutput'
import { type Extension, expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { Page } from '@playwright/test'
import type { PixelChatGeometry } from '../../../shared/settings/chatGeometry'
import type { ChatGeometry, ChatGeometryV2 } from '../../../shared/settings/model'
import { APPEARANCE_STORAGE_KEY, GEOMETRY_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const scenarioState = {
  video: { id: 'ylc-overlay-boundary', title: 'Overlay interaction fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'live',
    native: { state: 'absent' },
    response: 'playable',
  },
} satisfies YouTubeScenarioState

const FIXTURE_REFERENCE = { width: 1280, height: 720 }
const SEEDED_LAYOUT: PixelChatGeometry = {
  coordinates: { x: 100, y: 80 },
  size: { width: 400, height: 300 },
}
const SEEDED_GEOMETRY: ChatGeometryV2 = {
  reference: 'player',
  rect: { x: 100 / 1280, y: 80 / 720, width: 400 / 1280, height: 300 / 720 },
  pinned: true,
}

const readPersistedGeometry = (storagePage: Page): Promise<ChatGeometry | null> =>
  storagePage.evaluate(async key => {
    const stored = (await chrome.storage.local.get(key))[key] as { value?: ChatGeometry } | undefined
    return stored?.value ?? null
  }, GEOMETRY_STORAGE_KEY)

const expectPersistedLayout = async (storagePage: Page, layout: { x: number; y: number; width: number; height: number }) => {
  // Storage uses fractions of the 1280 × 720 fixture player. Check each ratio
  // directly, without calling the converter that the overlay itself uses.
  await expect(async () => {
    const geometry = await readPersistedGeometry(storagePage)
    expect(geometry).toMatchObject({ reference: 'player', pinned: true })
    if (geometry?.reference !== 'player') throw new Error('Expected player-relative saved geometry.')
    expect(geometry.rect.x).toBeCloseTo(layout.x / 1280, 10)
    expect(geometry.rect.y).toBeCloseTo(layout.y / 720, 10)
    expect(geometry.rect.width).toBeCloseTo(layout.width / 1280, 10)
    expect(geometry.rect.height).toBeCloseTo(layout.height / 720, 10)
  }).toPass({ timeout: 5000 })
}

const openStoragePage = async (extension: Extension, page: Page) => {
  const storagePage = await page.context().newPage()
  await storagePage.goto(extension.url(E2E_BRIDGE_FILE), { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.bringToFront()
  return storagePage
}

test.describe('overlay browser interaction boundary', { tag: '@live' }, () => {
  test('keeps restricted participation chrome transparent over customized chat backgrounds', { tag: '@fixture' }, async ({
    page,
    extension,
  }) => {
    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load({ ...scenarioState, chat: { ...scenarioState.chat, restrictedParticipation: true } })
    await scenario.enterFullscreen()
    await overlay.expectChatLoaded({ timeout: 12000 })
    const chat = page.frameLocator('iframe[data-ylc-chat]')
    const container = chat.locator('yt-live-chat-restricted-participation-renderer > #container')
    for (const appearance of [
      { backgroundColor: { r: 20, g: 20, b: 20, a: 0.94 }, fontColor: { r: 255, g: 255, b: 255, a: 1 } },
      { backgroundColor: { r: 240, g: 220, b: 200, a: 0.4 }, fontColor: { r: 20, g: 30, b: 40, a: 1 } },
    ]) {
      await patchOverlayStore(extension, {
        profile: { appearance, display: { contentMode: 'full-chat', idleVisibility: 'always-visible' } },
      })
      const { r, g, b } = appearance.fontColor
      await expect(container).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      await expect(container).toHaveCSS('color', `rgb(${r}, ${g}, ${b})`)
      await expect(chat.locator('#body.yt-live-chat-restricted-participation-renderer')).toHaveCSS('color', `rgb(${r}, ${g}, ${b})`)
      await expect(container.locator('#message')).toHaveCSS('color', `rgb(${r}, ${g}, ${b})`)
    }
  })

  test('themes composer surfaces, emoji labels and notice actions across contrasting palettes', { tag: '@fixture' }, async ({
    page,
    extension,
  }) => {
    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load({ ...scenarioState, chat: { ...scenarioState.chat, appearanceSurfaces: true } })
    await scenario.enterFullscreen()
    await overlay.expectChatLoaded({ timeout: 12000 })
    const chat = page.frameLocator('iframe[data-ylc-chat]')
    const palettes = [
      { backgroundColor: { r: 255, g: 255, b: 255, a: 1 }, fontColor: { r: 15, g: 15, b: 15, a: 1 } },
      { backgroundColor: { r: 12, g: 16, b: 24, a: 0.94 }, fontColor: { r: 245, g: 240, b: 230, a: 1 } },
      { backgroundColor: { r: 48, g: 30, b: 72, a: 0.82 }, fontColor: { r: 247, g: 231, b: 255, a: 1 } },
      { backgroundColor: { r: 249, g: 228, b: 194, a: 0.8 }, fontColor: { r: 42, g: 55, b: 76, a: 1 } },
      { backgroundColor: { r: 0, g: 0, b: 0, a: 0 }, fontColor: { r: 255, g: 255, b: 255, a: 1 } },
    ]
    for (const appearance of palettes) {
      await patchOverlayStore(extension, {
        profile: { appearance, display: { contentMode: 'full-chat', idleVisibility: 'always-visible' } },
      })
      const { r, g, b } = appearance.fontColor
      const primary = `rgb(${r}, ${g}, ${b})`
      const secondary = `rgba(${r}, ${g}, ${b}, 0.6)`
      const control = `rgba(${r}, ${g}, ${b}, 0.12)`
      await expect(chat.locator('yt-live-chat-message-input-renderer #input-container')).toHaveCSS('background-color', control)
      await expect(chat.locator('yt-live-chat-participant-list-renderer #header')).toHaveCSS('background-color', control)
      await expect(chat.locator('yt-live-chat-participant-list-renderer #header')).toHaveCSS('color', primary)
      await expect(chat.getByRole('button', { name: 'Leave participants' }).locator('path')).toHaveCSS('fill', primary)
      await expect(chat.locator('yt-live-chat-participant-renderer #author-name:not(.owner)')).toHaveCSS('color', secondary)
      await expect(chat.locator('yt-live-chat-participant-renderer #author-name.owner')).toHaveCSS('color', 'rgb(255, 255, 255)')
      await expect(chat.locator('yt-live-chat-participant-renderer #author-name.owner')).toHaveCSS('background-color', 'rgb(15, 15, 15)')

      await expect(chat.locator('[contenteditable]')).toHaveCSS('color', primary)
      await expect(chat.locator('yt-emoji-picker-category-renderer #title')).toHaveCSS('color', secondary)
      await expect(chat.locator('yt-emoji-picker-category-renderer #title')).toHaveCSS('background-color', control)
      await expect(chat.locator('yt-emoji-picker-upsell-category-renderer #title')).toHaveCSS('color', secondary)
      await expect(chat.locator('yt-emoji-picker-upsell-category-renderer #title')).toHaveCSS('background-color', control)
      await expect(chat.locator('yt-emoji-picker-renderer #search-panel label')).toHaveCSS('color', secondary)
      await expect(chat.getByRole('button', { name: 'Clear emoji search' }).locator('path')).toHaveCSS('fill', primary)
      const { r: br, g: bg, b: bb, a: ba } = appearance.backgroundColor
      const floating = ba === 1 ? `rgb(${br}, ${bg}, ${bb})` : `rgba(${br}, ${bg}, ${bb}, 0.96)`
      await expect(chat.locator('yt-live-chat-product-picker-panel-view-model')).toHaveCSS('background-color', floating)
      await expect(chat.getByRole('button', { name: 'Close purchase preview' })).toHaveCSS('color', primary)
      await expect(chat.getByRole('button', { name: 'Close purchase preview' }).locator('path')).toHaveCSS('fill', primary)
      await expect(chat.locator('yt-live-chat-super-sticker-preview-renderer #back-button')).toHaveCSS('background-color', control)
      await expect(chat.getByRole('button', { name: 'Show stickers' })).toHaveCSS('color', primary)
      await expect(chat.getByRole('button', { name: 'Purchase sticker' })).toHaveCSS('background-color', 'rgb(6, 95, 212)')
      await expect(chat.getByRole('button', { name: 'Purchase sticker' })).toHaveCSS('color', 'rgb(241, 241, 241)')
      await expect(chat.locator('yt-live-chat-super-sticker-pack-backstory-renderer')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
      await expect(chat.locator('yt-live-chat-super-sticker-pack-backstory-renderer #content')).toHaveCSS('color', 'rgb(15, 15, 15)')
      const offer = chat.locator('ytd-sponsorships-gift-offer-renderer')
      await expect(offer).toHaveCSS(
        'background-color',
        await chat.locator('yt-emoji-picker-renderer').evaluate(e => getComputedStyle(e).backgroundColor),
      )
      await expect(offer.locator('ytd-sponsorships-gift-offer-header-renderer')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      await expect(offer.locator('ytd-sponsorships-gift-offer-body-renderer')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      await expect(offer.locator('#title').first()).toHaveCSS('color', primary)
      await expect(offer.locator('#subtitle')).toHaveCSS('color', secondary)
      await expect(offer.locator('ytd-offer-section-renderer yt-formatted-string.title')).toHaveCSS('color', primary)
      await expect(offer.locator('ytd-offer-content-renderer yt-formatted-string.title')).toHaveCSS('color', primary)
      await expect(chat.getByRole('button', { name: 'Close membership gift' })).toHaveCSS('color', primary)
      await expect(chat.getByRole('button', { name: 'Choose membership quantity' })).toHaveCSS('color', primary)
      await expect(chat.getByRole('button', { name: 'Choose membership quantity' }).locator('path')).toHaveCSS('fill', primary)
      const quantity = chat.getByRole('button', { name: 'Choose membership quantity' })
      await expect(quantity).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      // Native CallToAction text buttons otherwise keep a pale blue hover fill,
      // making a configured light foreground disappear. Hover without clicking.
      await quantity.hover()
      await expect(quantity).toHaveCSS('background-color', control)
      await expect(quantity).toHaveCSS('color', primary)
      await page.mouse.move(1100, 600)
      await expect(quantity).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      const disabledQuantity = chat.getByRole('button', { name: 'Disabled membership quantity' })
      await expect(disabledQuantity).toBeDisabled()
      await expect(disabledQuantity).toHaveCSS('color', 'rgba(15, 15, 15, 0.3)')
      await expect(disabledQuantity).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.05)')
      const nativeFilled = chat.getByRole('button', { name: 'Native filled membership action' })
      await expect(nativeFilled).toHaveCSS('color', 'rgb(241, 241, 241)')
      await expect(nativeFilled).toHaveCSS('background-color', 'rgb(6, 95, 212)')
      await expect(chat.locator('#fixture-poll-panel')).toHaveCSS('background-color', floating)
      await expect(chat.locator('yt-live-chat-poll-header-renderer #poll-question')).toHaveCSS('color', primary)
      await expect(chat.locator('yt-live-chat-poll-header-renderer .metadata')).toHaveCSS('color', secondary)
      await expect(chat.getByRole('button', { name: 'Poll menu' }).locator('path')).toHaveCSS('fill', primary)
      await expect(chat.getByRole('button', { name: 'Poll option', exact: true })).toHaveCSS('background-color', control)
      await expect(chat.getByRole('button', { name: 'Poll option', exact: true }).locator('#label-text')).toHaveCSS('color', primary)
      const result = chat.getByRole('button', { name: 'Selected poll result' })
      await expect(result.locator('#label-text')).toHaveCSS('color', primary)
      await expect(result.locator('#vote-percentage-text')).toHaveCSS('color', primary)
      await expect(result.locator('#vote-percentage-bar')).toHaveCSS('background-color', control)
      expect(await result.locator('#vote-percentage-bar').evaluate(e => (e as HTMLElement).style.width)).toBe('60%')
      await expect(result.locator('#selected-icon path')).toHaveCSS('fill', primary)
      await expect(chat.getByRole('button', { name: 'Disabled poll option' }).locator('#label-text')).toHaveCSS('color', secondary)
      await expect(chat.getByRole('button', { name: 'Disabled poll option' })).toHaveAttribute('aria-disabled', 'true')

      await expect(chat.getByRole('textbox', { name: 'Search emoji' })).toHaveCSS('color', primary)
      await expect
        .poll(() => chat.getByRole('textbox', { name: 'Search emoji' }).evaluate(e => getComputedStyle(e, '::placeholder').color))
        .toBe(secondary)
      await expect(chat.getByRole('link', { name: 'Details' })).toHaveCSS('color', primary)
      await expect(chat.locator('ytd-engagement-panel-title-header-renderer #title-text')).toHaveCSS('color', primary)
      await expect(chat.getByRole('button', { name: 'Back to chat' })).toHaveCSS('color', primary)
      await expect(chat.getByRole('button', { name: 'Back to chat' }).locator('path')).toHaveCSS('fill', primary)
      const giftCard = chat.getByRole('button', { name: 'Gift choice', exact: true }).locator('yt-pdg-gift-item-view-model')
      await expect(giftCard).toHaveCSS('background-color', control)
      await expect(giftCard.locator('.ytwPdgGiftItemGiftName')).toHaveCSS('color', primary)
      await expect(giftCard.locator('.ytwPdgGiftItemTokenAmount')).toHaveCSS('color', primary)
      await expect(giftCard.getByAltText('Gift artwork')).toHaveCSS('filter', 'none')
      await expect(chat.getByRole('button', { name: 'Selected gift choice' }).locator('yt-pdg-gift-item-view-model')).toHaveCSS(
        'color',
        'rgb(241, 241, 241)',
      )
      await expect(chat.getByRole('button', { name: 'Unavailable gift choice' }).locator('yt-pdg-gift-item-view-model')).toHaveCSS(
        'background-color',
        'rgb(255, 255, 255)',
      )
      await expect(chat.locator('#fixture-jewels-balance')).toHaveCSS('color', 'rgb(6, 95, 212)')
      await expect(chat.locator('#fixture-semantic-icon')).toHaveCSS('color', 'rgb(255, 0, 51)')
      await expect(chat.locator('#fixture-colored-emoji')).toHaveCSS('color', 'rgb(255, 128, 0)')
    }
  })

  test('matches the gift entry background to composer peers without recoloring disabled buttons or gift artwork', {
    tag: '@fixture',
  }, async ({ page, extension }) => {
    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load({ ...scenarioState, chat: { ...scenarioState.chat, giftButton: true } })
    await scenario.enterFullscreen()
    await overlay.expectChatLoaded({ timeout: 12000 })
    const chat = page.frameLocator('iframe[data-ylc-chat]')
    const button = chat.getByRole('button', { name: 'Gift', exact: true })
    for (const appearance of [
      { backgroundColor: { r: 12, g: 16, b: 24, a: 0.9 }, fontColor: { r: 245, g: 240, b: 230, a: 1 } },
      { backgroundColor: { r: 240, g: 220, b: 200, a: 0.4 }, fontColor: { r: 20, g: 30, b: 40, a: 1 } },
    ]) {
      await patchOverlayStore(extension, {
        profile: { appearance, display: { contentMode: 'full-chat', idleVisibility: 'always-visible' } },
      })
      const { r, g, b } = appearance.fontColor
      const color = `rgb(${r}, ${g}, ${b})`
      await expect(button).toHaveCSS('color', color)
      await expect(button.locator('.ytSpecIconShapeHost')).toHaveCSS('color', color)
      await expect(button.locator('path')).toHaveCSS('fill', color)
      const expectedBackground = await chat
        .getByRole('button', { name: 'Emoji', exact: true })
        .evaluate(element => getComputedStyle(element).backgroundColor)
      await expect(button).toHaveCSS('background-color', expectedBackground)
      await button.hover()
      const expectedHover = await button.evaluate(element =>
        getComputedStyle(element.ownerDocument.documentElement).getPropertyValue('--extension-yt-live-menu-hover-background-color').trim(),
      )
      await expect(button).toHaveCSS('background-color', expectedHover)
      await expect(chat.getByRole('button', { name: 'Disabled gift', exact: true })).toBeDisabled()
      await expect(chat.getByRole('button', { name: 'Disabled gift', exact: true })).toHaveCSS('color', 'rgba(15, 15, 15, 0.3)')
      await expect(chat.locator('#gift-catalog-icon')).toHaveCSS('color', 'rgb(1, 128, 255)')
      await page.mouse.move(1, 1)
      await expect(button).toHaveCSS('background-color', expectedBackground)
    }
  })

  test('resizes from every edge and corner while preserving each opposite edge', { tag: '@fixture' }, async ({ page, extension }) => {
    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await patchOverlayStore(extension, { geometry: SEEDED_GEOMETRY })
    const storagePage = await openStoragePage(extension, page)
    try {
      await scenario.load(scenarioState)
      await scenario.enterFullscreen()
      await overlay.expectChatLoaded({ timeout: 12000 })
      const cases = [
        ['top', { x: 0, y: 10 }, { x: 100, y: 90, width: 400, height: 290 }],
        ['right', { x: 10, y: 0 }, { x: 100, y: 80, width: 410, height: 300 }],
        ['bottom', { x: 0, y: 10 }, { x: 100, y: 80, width: 400, height: 310 }],
        ['left', { x: 10, y: 0 }, { x: 110, y: 80, width: 390, height: 300 }],
        ['topRight', { x: 10, y: 10 }, { x: 100, y: 90, width: 410, height: 290 }],
        ['bottomRight', { x: 10, y: 10 }, { x: 100, y: 80, width: 410, height: 310 }],
        ['bottomLeft', { x: 10, y: 10 }, { x: 110, y: 80, width: 390, height: 310 }],
        ['topLeft', { x: 10, y: 10 }, { x: 110, y: 90, width: 390, height: 290 }],
      ] as const

      for (const [direction, delta, expected] of cases) {
        await patchOverlayStore(extension, { geometry: SEEDED_GEOMETRY })
        await expect.poll(() => overlay.getGeometry()).toMatchObject({ x: 100, y: 80, width: 400, height: 300 })
        await overlay.startResize(direction, delta)
        await expect.poll(() => overlay.getGeometry(), { message: direction }).toMatchObject(expected)
        expect(await readPersistedGeometry(storagePage)).toEqual(SEEDED_GEOMETRY)
        await overlay.finishPointerGesture()
        await expectPersistedLayout(storagePage, expected)
      }
    } finally {
      await page.mouse.up().catch(() => null)
      await storagePage.close()
    }
  })

  test(
    'keeps placement actions inside a small chat at the upper player edge',
    { tag: '@fixture' },
    async ({ page, extension }, testInfo) => {
      await patchOverlayStore(extension, {
        geometry: {
          reference: 'player',
          rect: { x: 10 / 1280, y: 10 / 720, width: 240 / 1280, height: 180 / 720 },
          pinned: true,
        },
      })
      const scenario = new YouTubeScenario(page)
      const overlay = new ExtensionOverlay(page)
      await scenario.load(scenarioState)
      await scenario.enterFullscreen()
      await overlay.expectChatLoaded({ timeout: 12000 })
      await page.mouse.move(120, 100)
      await page.locator('[data-ylc-placement-button]').click()
      const panel = page.locator('[data-ylc-placement-panel]')
      await expect(panel).toBeVisible()
      const box = await panel.boundingBox()
      expect(box).not.toBeNull()
      expect(box?.y).toBeGreaterThanOrEqual(4)
      await testInfo.attach('small-chat-placement', { body: await page.screenshot(), contentType: 'image/png' })
      await page.getByRole('button', { name: 'Move up', exact: true }).click()
      await panel.hover()
      await page.mouse.wheel(0, 400)
      await expect.poll(() => panel.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
      await panel.getByRole('button', { name: 'Close', exact: true }).click()
      await expect(panel).toHaveCount(0)
      await expect(page.locator('[data-ylc-placement-button]')).toBeFocused()
    },
  )

  test('wires drag, eight resize handles, clamp, passthrough, keyboard, and operation-end persistence', { tag: '@fixture' }, async ({
    page,
    extension,
  }) => {
    test.setTimeout(120000)

    expect(await patchOverlayStore(extension, { geometry: SEEDED_GEOMETRY })).not.toBeNull()
    const storagePage = await openStoragePage(extension, page)
    try {
      const scenario = new YouTubeScenario(page)
      const overlay = new ExtensionOverlay(page)
      await scenario.load(scenarioState)
      await scenario.enterFullscreen()
      await overlay.expectSwitchReady({ timeout: 12000 })
      await overlay.expectChatLoaded({ timeout: 12000 })
      await expect
        .poll(() => overlay.getGeometry())
        .toMatchObject({
          x: SEEDED_LAYOUT.coordinates.x,
          y: SEEDED_LAYOUT.coordinates.y,
          width: SEEDED_LAYOUT.size.width,
          height: SEEDED_LAYOUT.size.height,
        })
      const viewport = await overlay.getGeometry()
      expect(viewport).toMatchObject({ viewportWidth: FIXTURE_REFERENCE.width, viewportHeight: FIXTURE_REFERENCE.height })

      expect((await overlay.getResizeDirections()).sort()).toEqual(
        ['top', 'right', 'bottom', 'left', 'topRight', 'bottomRight', 'bottomLeft', 'topLeft'].sort(),
      )

      await overlay.clickPlayerBoundaryProbe()
      await expect.poll(() => overlay.boundaryProbeClicks()).toBe(1)

      // Exercise clamping with a large delta, then return the synthetic pointer
      // to a browser-deliverable viewport coordinate before pointerup.
      await overlay.startDrag({ x: -200, y: -160 })
      await page.mouse.move(1, 1)
      const clampedCoordinates = { x: 10, y: 10 }
      await expect
        .poll(() => overlay.getGeometry())
        .toMatchObject({
          ...clampedCoordinates,
          width: SEEDED_LAYOUT.size.width,
          height: SEEDED_LAYOUT.size.height,
        })
      expect(await readPersistedGeometry(storagePage)).toEqual(SEEDED_GEOMETRY)

      await overlay.finishPointerGesture()
      await expectPersistedLayout(storagePage, { ...clampedCoordinates, width: 400, height: 300 })
      const draggedGeometry = await readPersistedGeometry(storagePage)

      await overlay.startResize('bottomRight', { x: -80, y: -60 })
      await expect
        .poll(() => overlay.getGeometry())
        .toMatchObject({
          ...clampedCoordinates,
          width: 320,
          height: 240,
        })
      expect(await readPersistedGeometry(storagePage)).toEqual(draggedGeometry)

      await overlay.finishPointerGesture()
      await expectPersistedLayout(storagePage, { ...clampedCoordinates, width: 320, height: 240 })

      await overlay.moveWithKeyboard('ArrowRight')
      await expectPersistedLayout(storagePage, { x: 20, y: 10, width: 320, height: 240 })
    } finally {
      await storagePage.close()
    }
  })

  test('collapses messages-only chrome at idle and preserves interactive geometry while expanded', { tag: '@fixture' }, async ({
    page,
    extension,
  }) => {
    test.setTimeout(90000)

    expect(
      await patchOverlayStore(extension, {
        profile: {
          display: {
            idleVisibility: 'always-visible',
            contentMode: 'messages-only',
          },
        },
      }),
    ).not.toBeNull()

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(scenarioState)
    await scenario.enterFullscreen()
    await overlay.expectSwitchReady({ timeout: 12000 })
    await overlay.expectChatLoaded({ timeout: 12000 })
    await overlay.installChatOnlyGeometryProbe()

    await expect
      .poll(() => overlay.getChatOnlyGeometryState())
      .toMatchObject({
        collapsed: true,
        header: { height: 0 },
        input: { height: 0 },
        iframe: { width: 400, height: 400 },
        viewport: { width: 400, height: 400 },
        carrier: { width: 400, height: 400 },
        iframeMatchesViewport: true,
        carrierMatchesViewport: true,
      })

    await overlay.frame().hover({ position: { x: 200, y: 160 } })
    await expect
      .poll(() => overlay.getChatOnlyGeometryState())
      .toMatchObject({
        collapsed: false,
        header: { height: 56 },
        input: { height: 64 },
        reaction: { width: 44, height: 44 },
        popover: { width: 180, height: 96 },
        iframeMatchesViewport: true,
        carrierMatchesViewport: true,
        reactionFullyVisible: true,
        popoverFullyVisible: true,
        reactionHitTestVisible: true,
        popoverHitTestVisible: true,
      })

    await page.mouse.move(1000, 600)
    await expect
      .poll(() => overlay.getChatOnlyGeometryState())
      .toMatchObject({
        collapsed: true,
        header: { height: 0 },
        input: { height: 0 },
        iframeMatchesViewport: true,
        carrierMatchesViewport: true,
      })
  })

  test('keeps auto-hidden chat visible while the document has lost focus', { tag: '@fixture' }, async ({ page, extension }) => {
    expect(
      await patchOverlayStore(extension, {
        profile: { display: { idleVisibility: 'auto-hide' } },
      }),
    ).not.toBeNull()

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(scenarioState)
    await scenario.enterFullscreen()
    await overlay.expectSwitchReady({ timeout: 12000 })
    await overlay.expectChatLoaded({ timeout: 12000 })
    const viewport = overlay.chatViewport()
    await page.mouse.move(1100, 600)
    await expect(viewport).toHaveCSS('opacity', '0', { timeout: 3000 })

    await overlay.emulateDocumentFocus(false)
    await expect(viewport).toHaveCSS('opacity', '1')

    await overlay.emulateDocumentFocus(true)
    await expect(viewport).toHaveCSS('opacity', '0')
  })

  test(
    'previews a held native text-size drag in the chat, then saves once and undoes once',
    { tag: '@fixture' },
    async ({ page, extension }, testInfo) => {
      test.setTimeout(90000)
      const initialFontSize = 13
      expect(
        await patchOverlayStore(extension, {
          geometry: SEEDED_GEOMETRY,
          profile: { appearance: { fontSize: initialFontSize } },
        }),
      ).not.toBeNull()
      const storagePage = await openStoragePage(extension, page)
      let pointerHeld = false
      try {
        const readSavedFontSize = () =>
          storagePage.evaluate(async key => {
            const stored = (await chrome.storage.local.get(key))[key] as
              | {
                  value?: { profile?: { appearance?: { fontSize?: number } } }
                }
              | undefined
            return stored?.value?.profile?.appearance?.fontSize ?? null
          }, APPEARANCE_STORAGE_KEY)
        await storagePage.evaluate(key => {
          const values: number[] = []
          Object.defineProperty(window, '__ylcAppearanceChanges', { configurable: true, value: values })
          chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local' || !changes[key]) return
            const stored = changes[key].newValue as
              | {
                  value?: { profile?: { appearance?: { fontSize?: number } } }
                }
              | undefined
            const fontSize = stored?.value?.profile?.appearance?.fontSize
            if (typeof fontSize === 'number') values.push(fontSize)
          })
        }, APPEARANCE_STORAGE_KEY)
        const readAppearanceChanges = () =>
          storagePage.evaluate(() => (window as unknown as { __ylcAppearanceChanges: number[] }).__ylcAppearanceChanges)
        const scenario = new YouTubeScenario(page)
        const overlay = new ExtensionOverlay(page)
        await scenario.load(scenarioState)
        await scenario.enterFullscreen()
        await overlay.expectChatLoaded({ timeout: 12000 })
        await overlay.installChatTypographyProbe()
        const readChatTypography = () => overlay.getChatTypographyState()
        await expect.poll(readChatTypography).toMatchObject({ variable: '13px', renderedFontSize: '13px' })
        const initialTypography = await readChatTypography()
        await overlay.openSettings()
        const settingsFrame = overlay.settingsFrame()
        await expect(settingsFrame.locator('.ylc-setting-panel')).toBeFocused()
        await expect(settingsFrame.getByRole('tab', { name: 'Settings', exact: true })).not.toBeFocused()
        await testInfo.attach('settings-initial-focus', { body: await page.screenshot(), contentType: 'image/png' })
        await expect(settingsFrame.locator('[data-ylc-runtime-diagnostics]')).toHaveCount(0)
        await expect(settingsFrame.getByText('Compatibility', { exact: true })).toHaveCount(0)
        await expect(settingsFrame.getByRole('button', { name: 'Copy diagnostic report', exact: true })).toHaveCount(0)
        await expect(settingsFrame.getByRole('button', { name: 'Reload chat overlay', exact: true })).toHaveCount(0)
        const slider = settingsFrame.getByRole('slider', { name: 'Text Size', exact: true })
        await slider.scrollIntoViewIfNeeded()
        await expect(slider).toHaveValue(String(initialFontSize))
        const undo = settingsFrame.getByRole('button', { name: 'Undo style change', exact: true })
        await expect(undo).toBeDisabled()
        await slider.evaluate(input => {
          const state = { downs: 0, ups: 0, heldMoves: 0 }
          Object.defineProperty(input, '__ylcPointerProbe', { configurable: true, value: state })
          input.addEventListener('pointerdown', () => {
            state.downs += 1
          })
          input.addEventListener('pointermove', event => {
            if (((event as PointerEvent).buttons & 1) !== 0) state.heldMoves += 1
          })
          input.addEventListener('pointerup', () => {
            state.ups += 1
          })
        })
        const box = await slider.boundingBox()
        if (!box) throw new Error('The native text-size slider has no browser bounding box.')
        // The native thumb is 16px wide; place the press on its current center.
        const trackStart = box.x + 8
        const trackWidth = box.width - 16
        const y = box.y + box.height / 2
        await page.mouse.move(trackStart + trackWidth * ((initialFontSize - 10) / 30), y)
        await page.mouse.down()
        pointerHeld = true
        let previewFontSize = initialFontSize
        for (const fraction of [0.4, 0.75]) {
          await page.mouse.move(trackStart + trackWidth * fraction, y, { steps: 8 })
          previewFontSize = Number(await slider.inputValue())
          expect(previewFontSize).toBeGreaterThan(initialFontSize)
          await expect(slider).toHaveAttribute('aria-valuetext', `${previewFontSize}px`)
          await expect.poll(readChatTypography).toMatchObject({
            variable: `${previewFontSize}px`,
            renderedFontSize: `${previewFontSize}px`,
          })
          expect(await readSavedFontSize()).toBe(initialFontSize)
          expect(await readAppearanceChanges()).toEqual([])
          expect(
            await slider.evaluate(input => {
              const state = (input as HTMLElement & { __ylcPointerProbe: { downs: number; ups: number; heldMoves: number } })
                .__ylcPointerProbe
              return { downs: state.downs, ups: state.ups, movedWhileHeld: state.heldMoves > 0 }
            }),
          ).toEqual({ downs: 1, ups: 0, movedWhileHeld: true })
        }
        expect((await readChatTypography()).messageHeight).toBeGreaterThan(initialTypography.messageHeight)
        await testInfo.attach('native-slider-held-preview', { body: await page.screenshot(), contentType: 'image/png' })
        await page.mouse.up()
        pointerHeld = false
        await expect.poll(readSavedFontSize).toBe(previewFontSize)
        await expect.poll(readAppearanceChanges).toEqual([previewFontSize])
        await expect(undo).toBeEnabled()
        await undo.click()
        await expect.poll(readSavedFontSize).toBe(initialFontSize)
        await expect.poll(readAppearanceChanges).toEqual([previewFontSize, initialFontSize])
        await expect.poll(readChatTypography).toMatchObject({ variable: '13px', renderedFontSize: '13px' })
        await expect(undo).toBeDisabled()
        await settingsFrame.getByRole('button', { name: 'Close', exact: true }).click()
        await expect(overlay.settingsDialog()).toHaveCount(0)
        await expect.poll(readChatTypography).toMatchObject({ variable: '13px', renderedFontSize: '13px' })
      } finally {
        if (pointerHeld) await page.mouse.up().catch(() => null)
        await storagePage.close()
      }
    },
  )
})

test('reaches settings without hover and returns to the trigger, then adjusts with clicks', async ({ page, extension }) => {
  await patchOverlayStore(extension, { geometry: SEEDED_GEOMETRY })
  const scenario = new YouTubeScenario(page)
  const overlay = new ExtensionOverlay(page)
  await scenario.load(scenarioState)
  await scenario.enterFullscreen()
  await overlay.expectChatLoaded({ timeout: 12000 })
  await page.mouse.move(1, 1)
  const settings = page.locator('[data-ylc-settings-btn]')
  // Start from the browser's current focus, without focusing a control in code.
  for (let step = 0; step < 40; step++) {
    await page.keyboard.press('Tab')
    if (await settings.evaluate(element => element.matches(':focus'))) break
  }
  await expect(settings).toBeFocused()
  await expect(page.locator('[data-ylc-control-rail]')).toHaveCSS('opacity', '1')
  await page.keyboard.press('Enter')
  await expect(overlay.settingsDialog()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(overlay.settingsDialog()).toHaveCount(0)
  await expect(settings).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-ylc-placement-panel]')).toBeVisible()
  await page.screenshot({ path: '/tmp/ylc-placement-open.png' })
  const before = await overlay.getGeometry()
  await page.getByRole('button', { name: 'Move down', exact: true }).click()
  await page.getByRole('button', { name: 'Increase width', exact: true }).click()
  await expect.poll(() => overlay.getGeometry()).toMatchObject({ y: before.y + 10, width: before.width + 10 })
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-ylc-placement-panel]')).toHaveCount(0)
  await expect.poll(() => overlay.getGeometry()).toMatchObject({ y: before.y + 10, width: before.width + 10 })
  await page.screenshot({ path: '/tmp/ylc-placement-closed.png' })
})

test('queries and retries the content session through the popup extension message boundary', async ({ page, extension }) => {
  const scenario = new YouTubeScenario(page)
  await scenario.load(scenarioState)
  await scenario.enterFullscreen()
  await new ExtensionOverlay(page).expectChatLoaded({ timeout: 12000 })
  const popup = await page.context().newPage()
  try {
    await popup.goto(extension.url('popup.html'))
    await page.bringToFront()
    const response = await popup.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id === undefined) throw new Error('No tab')
      const status = await chrome.tabs.sendMessage(tab.id, { type: 'ylc:status' }, { frameId: 0 })
      const retry = await chrome.tabs.sendMessage(tab.id, { type: 'ylc:retry', token: status.token }, { frameId: 0 })
      const stale = await chrome.tabs.sendMessage(tab.id, { type: 'ylc:retry', token: status.token }, { frameId: 0 })
      return { status, retry, stale }
    })
    expect(response.status.status).toBe('running')
    expect(response.status.report.schemaVersion).toBe(1)
    expect(JSON.stringify(response.status.report)).not.toContain(scenarioState.video.id)
    expect(response.retry.retry).toBe('accepted')
    expect(response.stale.retry).toBe('stale')
  } finally {
    await popup.close()
  }
})
