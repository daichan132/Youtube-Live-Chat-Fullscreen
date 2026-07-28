import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'

const VIDEO_ID = 'ylc-archive-borrow-restore-fixture'
const scenarioState = {
  video: { id: VIDEO_ID, title: 'Archive borrow and restore fixture', mode: 'archive' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'archive',
    native: {
      state: 'playable',
      showHideControl: true,
      slot: { beforeId: 'fixture-before', afterId: 'fixture-after' },
    },
    response: 'playable',
  },
} satisfies YouTubeScenarioState

test.describe('archive iframe borrow and restore', { tag: '@archive' }, () => {
  test('restores the borrowed replay iframe to its exact native slot', { tag: '@fixture' }, async ({ page }) => {
    test.setTimeout(120000)

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(scenarioState)
    await expect.poll(() => scenario.nativeIframeCount()).toBe(1)

    await scenario.enterFullscreen()

    await overlay.expectSwitchReady({ timeout: 12000 })
    await overlay.expectArchiveChatPlayable({ timeout: 12000 })
    await expect.poll(() => scenario.observeExtensionIframeIdentity()).toMatchObject({ id: 'chatframe', owned: null, nativeCount: 0 })

    await scenario.exitFullscreen()
    await overlay.expectOverlayRemoved({ timeout: 12000 })

    await expect
      .poll(() => scenario.observeNativeSlot())
      .toEqual({
        restored: true,
        attached: null,
        children: ['fixture-before', 'chatframe', 'fixture-after', 'show-hide-button'],
      })
  })
})
