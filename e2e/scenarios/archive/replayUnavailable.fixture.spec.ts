import { expect, test } from '@e2e/fixtures'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { hasPlayableChat, isExtensionChatLoaded, isExtensionOverlayRendered, isNativeChatUnavailable } from '@e2e/support/diagnostics'
import { buildWatchFixtureHtml, routeYouTubeWatchFixture } from '@e2e/support/youtubeFixture'
import { SHADOW_HOST, switchButtonContainerSelector, switchButtonSelector } from '@e2e/utils/selectors'

const VIDEO_ID = 'ylc-replay-unavailable-fixture'
const WATCH_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`
const REPLAY_UNAVAILABLE_CONTINUATION = 'ylc-replay-unavailable-continuation'

const watchFixtureHtml = buildWatchFixtureHtml({
  title: 'Replay unavailable fixture',
  videoId: VIDEO_ID,
  extraStyle: `
      #secondary { width: 420px; height: 640px; }
      #chat-container, ytd-live-chat-frame, #chatframe { display: block; width: 400px; height: 600px; }
  `,
  extraBody: `
    <div id="secondary">
      <div id="chat-container">
        <ytd-live-chat-frame>
          <iframe
            id="chatframe"
            class="ytd-live-chat-frame"
            src="https://www.youtube.com/live_chat_replay?continuation=${REPLAY_UNAVAILABLE_CONTINUATION}"
            srcdoc="<html><body><yt-live-chat-unavailable-message-renderer>Live chat replay is not available</yt-live-chat-unavailable-message-renderer></body></html>"
          ></iframe>
          <div id="show-hide-button">
            <button type="button" aria-label="Show chat replay">Show chat replay</button>
          </div>
        </ytd-live-chat-frame>
      </div>
    </div>
  `,
})

test.describe('replay unavailable archive fixture', { tag: ['@archive', '@fixture'] }, () => {
  test('extension chat stays hidden', async ({ page }) => {
    test.setTimeout(120000)

    await routeYouTubeWatchFixture(page, VIDEO_ID, watchFixtureHtml)

    const watchPage = new YouTubeWatchPage(page)
    await watchPage.goto(WATCH_URL)
    await watchPage.enterFullscreen()

    await expect.poll(async () => page.locator(SHADOW_HOST).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.locator(switchButtonContainerSelector).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.evaluate(isNativeChatUnavailable), { timeout: 12000 }).toBe(true)
    await expect.poll(async () => page.locator(switchButtonSelector).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.evaluate(hasPlayableChat)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionOverlayRendered)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionChatLoaded)).toBe(false)
  })
})
