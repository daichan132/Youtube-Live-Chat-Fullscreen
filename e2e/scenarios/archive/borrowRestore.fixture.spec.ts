import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { buildPlayableChatHtml, buildWatchFixtureHtml, routeYouTubeWatchFixture } from '@e2e/support/youtubeFixture'

const VIDEO_ID = 'ylc-archive-borrow-restore-fixture'
const WATCH_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`

const watchFixtureHtml = buildWatchFixtureHtml({
  title: 'Archive borrow and restore fixture',
  videoId: VIDEO_ID,
  extraStyle: `
    #secondary { width: 420px; height: 640px; }
    #chat-container, ytd-live-chat-frame, #chatframe { display: block; width: 400px; height: 600px; }
  `,
  extraBody: `
    <div id="secondary">
      <div id="chat-container">
        <ytd-live-chat-frame video-id="${VIDEO_ID}">
          <span id="fixture-before"></span>
          <iframe
            id="chatframe"
            class="ytd-live-chat-frame"
            src="/live_chat_replay?v=${VIDEO_ID}&continuation=ylc-fixture"
          ></iframe>
          <span id="fixture-after"></span>
          <div id="show-hide-button">
            <button type="button" aria-label="Show chat replay">Show chat replay</button>
          </div>
        </ytd-live-chat-frame>
      </div>
    </div>
  `,
})

test.describe('archive iframe borrow and restore', { tag: '@archive' }, () => {
  test('restores the borrowed replay iframe to its exact native slot', { tag: '@fixture' }, async ({ page }) => {
    test.setTimeout(120000)

    await routeYouTubeWatchFixture(page, VIDEO_ID, watchFixtureHtml)
    await page.route('**/live_chat_replay?*', route =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: buildPlayableChatHtml('Playable archive chat fixture'),
      }),
    )

    const watchPage = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)
    await watchPage.goto(WATCH_URL)
    await expect.poll(() => page.locator('ytd-live-chat-frame > #chatframe').count()).toBe(1)

    await watchPage.enterFullscreen()

    expect(await overlay.waitForSwitchReady({ timeout: 12000 })).toBe(true)
    expect(await overlay.waitForArchiveChatPlayable({ timeout: 12000 })).toBe(true)
    await expect
      .poll(() =>
        page.evaluate(() => {
          const iframe = window.__ylcHelpers.getExtensionIframe()
          return {
            id: iframe?.id ?? null,
            owned: iframe?.getAttribute('data-ylc-owned') ?? null,
            nativeCount: document.querySelectorAll('ytd-live-chat-frame > #chatframe').length,
          }
        }),
      )
      .toEqual({ id: 'chatframe', owned: null, nativeCount: 0 })

    expect(await watchPage.exitFullscreen()).toBe(true)
    expect(await overlay.waitForOverlayRemoved({ timeout: 12000 })).toBe(true)

    await expect
      .poll(() =>
        page.evaluate(() => {
          const host = document.querySelector('ytd-live-chat-frame')
          const iframe = host?.querySelector(':scope > #chatframe')
          const children = Array.from(host?.children ?? []).map(child => child.id)
          return {
            restored: Boolean(iframe),
            attached: iframe?.getAttribute('data-ylc-chat') ?? null,
            children,
          }
        }),
      )
      .toEqual({
        restored: true,
        attached: null,
        children: ['fixture-before', 'chatframe', 'fixture-after', 'show-hide-button'],
      })
  })
})
