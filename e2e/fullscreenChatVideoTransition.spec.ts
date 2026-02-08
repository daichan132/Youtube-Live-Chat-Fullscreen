import { expect, test } from './fixtures'
import { reliableClick } from './utils/actions'
import { acceptYouTubeConsent } from './utils/liveUrl'
import { switchButtonSelector } from './utils/selectors'
import { archiveReplayUrls } from './utils/testUrls'

const isExtensionArchiveChatPlayable = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return false
  if (iframe.getAttribute('data-ylc-owned') === 'true') return false
  const doc = iframe.contentDocument ?? null
  const href = doc?.location?.href ?? iframe.getAttribute('src') ?? iframe.src ?? ''
  if (!doc || !href || href.includes('about:blank')) return false
  return Boolean(doc.querySelector('yt-live-chat-renderer') && doc.querySelector('yt-live-chat-item-list-renderer'))
}

const getOverlayState = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  const pageUrl = new URL(window.location.href)
  const pageVideoId =
    document.querySelector('ytd-watch-flexy')?.getAttribute('video-id') ??
    document.getElementById('movie_player')?.getAttribute('video-id') ??
    pageUrl.searchParams.get('v')
  let href = ''
  if (iframe) {
    try {
      href = iframe.contentDocument?.location?.href ?? iframe.getAttribute('src') ?? iframe.src ?? ''
    } catch {
      href = iframe.getAttribute('src') ?? iframe.src ?? ''
    }
  }

  return {
    hasIframe: Boolean(iframe),
    href,
    pageVideoId: pageVideoId ?? '',
  }
}

const extractVideoId = (url: string) => {
  try {
    return new URL(url).searchParams.get('v')
  } catch {
    return null
  }
}

test('does not keep stale fullscreen chat iframe after video transition', async ({ page }) => {
  test.setTimeout(150000)

  let selectedUrl: string | null = null

  for (const url of archiveReplayUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await acceptYouTubeConsent(page)
      await page.waitForSelector('#movie_player', { state: 'attached', timeout: 20000 })
      await page.waitForSelector('ytd-live-chat-frame', { state: 'attached', timeout: 20000 })
      selectedUrl = url
      break
    } catch {
      // Try next archive URL.
    }
  }

  if (!selectedUrl) {
    test.skip(true, 'No archive video with chat replay found. Set YLC_ARCHIVE_URL to run this test.')
    return
  }

  const selectedVideoId = extractVideoId(selectedUrl)
  const transitionTargetId = archiveReplayUrls.map(extractVideoId).find(id => id && id !== selectedVideoId)
  if (!transitionTargetId) {
    test.skip(true, 'Need at least two archive replay video IDs to validate transition behavior.')
    return
  }

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null)

  await page.locator('#movie_player').hover()
  const switchButton = page.locator(switchButtonSelector)
  await expect(switchButton).toBeVisible({ timeout: 10000 })
  if ((await switchButton.getAttribute('aria-pressed')) !== 'true') {
    await reliableClick(switchButton, page, switchButtonSelector)
    await expect(switchButton).toHaveAttribute('aria-pressed', 'true')
  }

  await expect.poll(async () => page.evaluate(isExtensionArchiveChatPlayable), { timeout: 90000 }).toBe(true)

  const beforeTransition = await page.evaluate(getOverlayState)
  expect(beforeTransition.hasIframe).toBe(true)
  expect(beforeTransition.href).toBeTruthy()

  await page.evaluate((nextVideoId) => {
    const watchFlexy = document.querySelector('ytd-watch-flexy')
    if (watchFlexy) watchFlexy.setAttribute('video-id', nextVideoId)

    const moviePlayer = document.getElementById('movie_player')
    if (moviePlayer) moviePlayer.setAttribute('video-id', nextVideoId)

    const nextUrl = `/watch?v=${nextVideoId}`
    window.history.pushState({}, '', nextUrl)
    document.dispatchEvent(new Event('yt-navigate-finish'))
  }, transitionTargetId)

  await expect
    .poll(
      async () =>
        page.evaluate(({ oldHref, expectedVideoId }) => {
          const host = document.getElementById('shadow-root-live-chat')
          const root = host?.shadowRoot ?? null
          const iframe = root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
          const pageUrl = new URL(window.location.href)
          const pageVideoId =
            document.querySelector('ytd-watch-flexy')?.getAttribute('video-id') ??
            document.getElementById('movie_player')?.getAttribute('video-id') ??
            pageUrl.searchParams.get('v')
          let href = ''
          if (iframe) {
            try {
              href = iframe.contentDocument?.location?.href ?? iframe.getAttribute('src') ?? iframe.src ?? ''
            } catch {
              href = iframe.getAttribute('src') ?? iframe.src ?? ''
            }
          }

          const pageVideoUpdated = pageVideoId === expectedVideoId
          if (!pageVideoUpdated) return false
          if (!iframe) return true
          if (!href || href.includes('about:blank')) return true
          return href !== oldHref
        }, { oldHref: beforeTransition.href, expectedVideoId: transitionTargetId }),
      { timeout: 20000 },
    )
    .toBe(true)
})
