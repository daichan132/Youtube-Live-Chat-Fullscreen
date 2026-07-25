import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { buildPlayableChatHtml, buildWatchFixtureHtml, routeYouTubeWatchFixture } from '@e2e/support/youtubeFixture'

const VIDEO_ID = 'ylc-live-handoff-fixture'
const WATCH_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`

const watchFixtureHtml = buildWatchFixtureHtml({
  title: 'Live managed to native handoff fixture',
  videoId: VIDEO_ID,
  isLive: true,
  extraStyle: `
    #secondary { width: 420px; height: 640px; }
    #chat-container, ytd-live-chat-frame, #chatframe { display: block; width: 400px; height: 600px; }
  `,
  extraBody: `
    <div id="secondary">
      <div id="chat-container"></div>
    </div>
  `,
})

test.describe('live managed to native handoff', { tag: '@live' }, () => {
  test('promotes the managed iframe to the native iframe exactly once', { tag: '@fixture' }, async ({ page }) => {
    test.setTimeout(120000)

    await routeYouTubeWatchFixture(page, VIDEO_ID, watchFixtureHtml)
    await page.route('**/live_chat?*', route =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: buildPlayableChatHtml('Playable live chat fixture'),
      }),
    )

    const watchPage = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)
    await watchPage.goto(WATCH_URL)
    await watchPage.enterFullscreen()

    expect(await overlay.waitForSwitchReady({ timeout: 12000 })).toBe(true)
    expect(await overlay.waitForChatLoaded({ timeout: 12000 })).toBe(true)
    await expect
      .poll(() =>
        page.evaluate(() => {
          const iframe = window.__ylcHelpers.getExtensionIframe()
          return {
            owned: iframe?.getAttribute('data-ylc-owned') ?? null,
            source: iframe?.getAttribute('data-ylc-source') ?? null,
          }
        }),
      )
      .toEqual({ owned: 'true', source: 'live_direct' })

    await page.evaluate(videoId => {
      const host = document.createElement('ytd-live-chat-frame')
      host.setAttribute('video-id', videoId)
      const iframe = document.createElement('iframe')
      iframe.id = 'chatframe'
      iframe.className = 'ytd-live-chat-frame'
      iframe.src = `/live_chat?v=${videoId}&fixture=native`
      host.append(iframe)
      document.getElementById('chat-container')?.append(host)
    }, VIDEO_ID)

    await expect
      .poll(() =>
        page.evaluate(() => {
          const iframe = window.__ylcHelpers.getExtensionIframe()
          return {
            id: iframe?.id ?? null,
            owned: iframe?.getAttribute('data-ylc-owned') ?? null,
            managedCount: document.querySelectorAll('iframe[data-ylc-owned="true"]').length,
          }
        }),
      )
      .toEqual({ id: 'chatframe', owned: null, managedCount: 0 })
  })
})
