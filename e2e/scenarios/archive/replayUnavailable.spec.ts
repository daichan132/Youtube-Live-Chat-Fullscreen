import { getE2ETestTargets } from '@e2e/config/testTargets'
import { expect, test } from '@e2e/fixtures'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { hasPlayableChat, isExtensionChatLoaded, isExtensionOverlayRendered, isNativeChatUnavailable } from '@e2e/support/diagnostics'
import { buildWatchFixtureHtml, routeYouTubeWatchFixture } from '@e2e/support/youtubeFixture'
import { SHADOW_HOST, switchButtonContainerSelector, switchButtonSelector } from '@e2e/utils/selectors'

const REPLAY_UNAVAILABLE_FIXTURE_URL = 'https://www.youtube.com/watch?v=ylc-replay-unavailable-fixture'
const REPLAY_UNAVAILABLE_VIDEO_ID = 'ylc-replay-unavailable-fixture'
const REPLAY_UNAVAILABLE_CONTINUATION = 'ylc-replay-unavailable-continuation'

const replayUnavailableFixtureHtml = buildWatchFixtureHtml({
  title: 'Replay unavailable fixture',
  videoId: REPLAY_UNAVAILABLE_VIDEO_ID,
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

test.describe('replay unavailable archive chat', { tag: '@archive' }, () => {
  test('extension chat stays hidden on a deterministic replay-unavailable fixture', async ({ page }) => {
    test.setTimeout(120000)

    await routeYouTubeWatchFixture(page, REPLAY_UNAVAILABLE_VIDEO_ID, replayUnavailableFixtureHtml)

    const watchPage = new YouTubeWatchPage(page)
    await watchPage.goto(REPLAY_UNAVAILABLE_FIXTURE_URL)
    await watchPage.enterFullscreen()

    await expect.poll(async () => page.locator(SHADOW_HOST).count(), { timeout: 12000 }).toBe(1)
    await expect.poll(async () => page.locator(switchButtonContainerSelector).count(), { timeout: 12000 }).toBe(1)
    await expect.poll(async () => page.evaluate(isNativeChatUnavailable), { timeout: 12000 }).toBe(true)
    await expect.poll(async () => page.locator(switchButtonSelector).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.evaluate(hasPlayableChat)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionOverlayRendered)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionChatLoaded)).toBe(false)
  })

  test('extension chat stays hidden when native replay is unavailable', async ({ page }) => {
    test.setTimeout(120000)

    const replayUnavailableUrl = getE2ETestTargets().replayUnavailable.url
    if (!replayUnavailableUrl) {
      test.skip(true, 'Set YLC_REPLAY_UNAVAILABLE_URL to run this contract against a stable replay-unavailable video.')
      return
    }

    const watchPage = new YouTubeWatchPage(page)
    await watchPage.goto(replayUnavailableUrl)
    await watchPage.enterFullscreen()

    await expect.poll(async () => page.locator(SHADOW_HOST).count(), { timeout: 12000 }).toBe(1)
    await expect.poll(async () => page.locator(switchButtonContainerSelector).count(), { timeout: 12000 }).toBe(1)

    const hasUnavailableNative = await expect
      .poll(async () => page.evaluate(isNativeChatUnavailable), { timeout: 30000 })
      .toBe(true)
      .then(
        () => true,
        () => false,
      )

    if (!hasUnavailableNative) {
      const playableNative = await page.evaluate(hasPlayableChat)
      if (playableNative) {
        test.skip(true, 'Selected URL had playable chat and did not meet replay-unavailable precondition.')
        return
      }
      test.skip(true, 'Selected URL did not expose a native unavailable replay marker.')
      return
    }

    await expect.poll(async () => page.locator(switchButtonSelector).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.evaluate(hasPlayableChat)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionOverlayRendered)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionChatLoaded)).toBe(false)
  })
})
