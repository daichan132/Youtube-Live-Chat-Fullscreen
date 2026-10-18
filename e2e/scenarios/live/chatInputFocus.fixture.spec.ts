import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'

const state = {
  video: { id: 'ylc-chat-input-focus', title: 'Local unsent composer fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'live',
    purchaseInteractions: true,
    native: { state: 'absent' },
    response: 'playable',
  },
} satisfies YouTubeScenarioState

test('keeps an actively edited native draft visible until focus leaves the composer', { tag: ['@fixture', '@live'] }, async ({
  page,
  extension,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await patchOverlayStore(extension, {
    geometry: { reference: 'player', rect: { x: 100 / 1280, y: 80 / 720, width: 400 / 1280, height: 300 / 720 }, pinned: true },
    profile: { display: { contentMode: 'full-chat', idleVisibility: 'auto-hide' } },
  })
  const scenario = new YouTubeScenario(page)
  await scenario.load(state)
  await scenario.enterFullscreen()
  const overlay = new ExtensionOverlay(page)
  await overlay.expectChatLoaded({ timeout: 12000 })
  await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(true)
  const initialGeometry = await overlay.getGeometry()
  const chat = page.frameLocator('iframe[data-ylc-chat]')
  const composer = chat.locator('[contenteditable][aria-label="Chat draft"]')

  // The ordinary auto-hide setting still applies before input receives focus.
  await page.mouse.move(1100, 600)
  await expect(overlay.chatViewport()).toHaveCSS('opacity', '0', { timeout: 3000 })
  await overlay.frame().hover()
  await composer.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type('hello')
  await page.mouse.move(1100, 600)
  for (let index = 0; index < 6; index += 1) {
    await page.waitForTimeout(350)
    await page.keyboard.type('o')
    await expect(composer).toBeFocused()
    await expect(overlay.chatViewport()).toHaveCSS('opacity', '1')
  }
  await expect(composer).toHaveText('hellooooooo')
  await expect(page.locator('[data-ylc-control-rail]')).toHaveCSS('opacity', '0')
  expect(await overlay.getGeometry()).toEqual(initialGeometry)
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
  expect(
    await chat.locator('body').evaluate(body => ({
      activePurchase: body.classList.contains('ylc-native-purchase-active'),
      counters: (body.ownerDocument.defaultView as Window & { __ylcFixturePurchase?: Record<string, number> }).__ylcFixturePurchase,
    })),
  ).toMatchObject({ activePurchase: false, counters: { supportEntries: 0, superChatEntries: 0, membershipEntries: 0, confirmations: 0 } })

  // A real click in the player ends the focus hold, without submitting a draft.
  await overlay.clickPlayerBoundaryProbe()
  await expect(composer).not.toBeFocused()
  await expect(overlay.chatViewport()).toHaveCSS('opacity', '0', { timeout: 3000 })
  await expect(composer).toHaveText('hellooooooo')
  await overlay.revealControls()
  await expect(page.getByRole('button', { name: 'Drag to move' })).toBeEnabled()
  expect(await overlay.getGeometry()).toEqual(initialGeometry)
})
