import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'

const VIDEO_ID = 'ylc-source-fixture'
const state = {
  video: { id: VIDEO_ID, title: 'Native chat source boundary', mode: 'live' },
  page: { chatContainer: 'present' },
  fullscreen: false,
  chat: { mode: 'live', native: { state: 'absent' }, response: 'playable' },
} satisfies YouTubeScenarioState

test.describe('native chat source boundary', { tag: ['@live', '@fixture'] }, () => {
  for (const [name, href, redirect] of [
    ['foreign origin', `https://untrusted.example/live_chat?v=${VIDEO_ID}`, false],
    ['chat path in a query', `https://www.youtube.com/redirect?v=${VIDEO_ID}&next=/live_chat`, false],
    ['chat path prefix', `https://www.youtube.com/live_chat_extra?v=${VIDEO_ID}`, false],
    ['foreign navigation with a trusted src', `https://untrusted.example/redirected?v=${VIDEO_ID}`, true],
  ] as const) {
    test(`leaves a misleading iframe at its native slot: ${name}`, async ({ page }) => {
      const scenario = new YouTubeScenario(page)
      const overlay = new ExtensionOverlay(page)
      await scenario.load(state)
      const declaredSrc = await scenario.addMisleadingNativeIframe(href, redirect)
      if (redirect) expect(declaredSrc).toBe(`/live_chat?v=${VIDEO_ID}&fixture=native`)
      await scenario.enterFullscreen()

      await overlay.expectChatLoaded({ timeout: 12000 })
      await expect
        .poll(() => scenario.observeExtensionIframeIdentity())
        .toEqual({
          id: null,
          owned: 'true',
          source: 'live_direct',
          managedCount: 1,
          nativeCount: 1,
        })
      await expect.poll(() => scenario.observeExtensionIframeHref()).toBe(`https://www.youtube.com/live_chat?v=${VIDEO_ID}`)
    })
  }
})
