import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { freezeContentClock } from '@e2e/support/freezeContentClock'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { readContentStatusViaPopup } from '@e2e/utils/popupHelpers'

const VIDEO_ID = 'ylc-archive-borrow-restore-fixture'
const nativeStyles = [
  { property: 'width', value: '360px', priority: 'important' },
  { property: 'height', value: '600px', priority: 'important' },
  { property: 'border-top-style', value: 'solid', priority: 'important' },
  { property: 'border-right-style', value: 'dashed', priority: '' },
  { property: 'border-top-width', value: '3px', priority: 'important' },
  { property: 'outline-style', value: 'dotted', priority: 'important' },
  { property: 'outline-width', value: '2px', priority: '' },
  { property: 'margin-left', value: '12px', priority: 'important' },
]
const scenarioState = {
  video: { id: VIDEO_ID, title: 'Archive borrow and restore fixture', mode: 'archive' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'archive',
    native: {
      state: 'playable',
      inlineStyle: nativeStyles.map(({ property, value, priority }) => `${property}:${value}${priority ? ' !important' : ''}`).join(';'),
      showHideControl: true,
      slot: { beforeId: 'fixture-before', afterId: 'fixture-after' },
    },
    response: 'playable',
  },
} satisfies YouTubeScenarioState

test.describe('archive iframe borrow and restore', { tag: '@archive' }, () => {
  test('requests each new archive without waiting for the previous video cooldown', { tag: '@fixture' }, async ({ page, extension }) => {
    const closedArchive = (id: string): YouTubeScenarioState => ({
      video: { id, title: 'Closed replay fixture', mode: 'archive' },
      page: { chatContainer: 'present', chatDimensions: 'standard' },
      fullscreen: false,
      chat: { mode: 'archive', native: { state: 'absent' }, response: 'playable' },
    })
    const scenario = new YouTubeScenario(page)
    await scenario.load(closedArchive('ylc-archive-open-a'))
    const clock = await freezeContentClock(page, extension.id, 1_000_000)
    try {
      expect(await clock.read()).toBe(1_000_000)
      await scenario.installClosedArchiveControl()
      await scenario.enterFullscreen()
      await expect.poll(() => scenario.observeArchiveOpenEvents()).toMatchObject([{ videoId: 'ylc-archive-open-a' }])

      await scenario.spaNavigate(closedArchive('ylc-archive-open-b'))
      expect(await clock.read()).toBe(1_000_000)
      await scenario.installClosedArchiveControl()
      await scenario.enterFullscreen()
      await expect.poll(() => scenario.observeArchiveOpenEvents()).toMatchObject([
        { videoId: 'ylc-archive-open-a' },
        { videoId: 'ylc-archive-open-b' },
      ])

      const popup = await page.context().newPage()
      try {
        await popup.goto(extension.url('popup.html'))
        await page.bringToFront()
        const previous = await readContentStatusViaPopup(popup)
        if (!previous?.report) throw new Error('Expected a running content runtime.')
        const previousGeneration = previous.report.runtime.generation
        await scenario.spaNavigate(closedArchive('ylc-archive-open-a'))
        expect(await clock.read()).toBe(1_000_000)
        await scenario.installClosedArchiveControl()
        await scenario.enterFullscreen()
        await expect
          .poll(async () => (await readContentStatusViaPopup(popup))?.report?.runtime.generation)
          .toBeGreaterThan(previousGeneration)
        expect(await scenario.observeArchiveOpenEvents()).toEqual([
          { videoId: 'ylc-archive-open-a' },
          { videoId: 'ylc-archive-open-b' },
        ])

        expect(await clock.set(1_002_001)).toBe(1_002_001)
        await scenario.notifyPageDataUpdated()
        await expect.poll(() => scenario.observeArchiveOpenEvents()).toEqual([
          { videoId: 'ylc-archive-open-a' },
          { videoId: 'ylc-archive-open-b' },
          { videoId: 'ylc-archive-open-a' },
        ])
      } finally {
        await popup.close()
        await page.bringToFront()
      }
    } finally {
      await clock.dispose()
    }
  })

  test('restores the borrowed replay iframe to its exact native slot', { tag: '@fixture' }, async ({ page }) => {
    test.setTimeout(120000)

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(scenarioState)
    await expect.poll(() => scenario.nativeIframeCount()).toBe(1)

    const nativeChat = page.frameLocator('iframe#chatframe')
    await nativeChat.locator('yt-live-chat-item-list-renderer').waitFor({ state: 'attached' })
    const floatingSurfaceProperty = '--extension-yt-live-floating-panel-background-color'
    const originalSurface = 'rgba(1, 2, 3, 0.4)'
    await nativeChat.locator('html').evaluate(
      (element, { property, value }) => {
        element.style.setProperty(property, value, 'important')
      },
      { property: floatingSurfaceProperty, value: originalSurface },
    )

    await scenario.enterFullscreen()

    await overlay.expectSwitchReady({ timeout: 12000 })
    await overlay.expectArchiveChatPlayable({ timeout: 12000 })
    await expect.poll(() => scenario.observeExtensionIframeIdentity()).toMatchObject({ id: 'chatframe', owned: null, nativeCount: 0 })

    await expect
      .poll(() =>
        page
          .frameLocator('iframe[data-ylc-chat]')
          .locator('html')
          .evaluate((element, property) => element.style.getPropertyValue(property), floatingSurfaceProperty),
      )
      .toBe('rgba(255, 255, 255, 1)')

    await scenario.exitFullscreen()
    await overlay.expectOverlayRemoved({ timeout: 12000 })

    await expect
      .poll(() => scenario.observeNativeSlot())
      .toEqual({
        restored: true,
        attached: null,
        children: ['fixture-before', 'chatframe', 'fixture-after', 'show-hide-button'],
      })
    await expect
      .poll(() =>
        nativeChat.locator('html').evaluate(
          (element, property) => ({
            value: element.style.getPropertyValue(property),
            priority: element.style.getPropertyPriority(property),
          }),
          floatingSurfaceProperty,
        ),
      )
      .toEqual({ value: originalSurface, priority: 'important' })
    expect(await scenario.observeNativeIframeStyles(nativeStyles.map(style => style.property))).toEqual(nativeStyles)
  })
})
