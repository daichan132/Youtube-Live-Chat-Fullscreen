import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { captureChatState, openArchiveWatchPage } from '@e2e/support/diagnostics'
import { meetsExternalYouTubePrecondition } from '@e2e/support/externalYouTubePreconditions'
import { extractVideoId, selectArchiveReplayTransitionPair } from '@e2e/support/urls/archiveReplay'
import type { Page } from '@playwright/test'

const NAVIGATION_SETTLE_TIMEOUT_MS = 15000

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

const getCurrentVideoId = () => {
  try {
    const url = new URL(window.location.href)
    return url.searchParams.get('v')
  } catch {
    return null
  }
}

const waitForVideoId = async (page: Page, videoId: string, timeout: number) => {
  return page
    .waitForFunction(
      expectedVideoId => {
        try {
          const current = new URL(window.location.href).searchParams.get('v')
          return current === expectedVideoId
        } catch {
          return false
        }
      },
      videoId,
      { timeout },
    )
    .then(
      () => true,
      () => false,
    )
}

const waitForVideoIdChange = async (page: Page, previousVideoId: string, timeout: number) => {
  return page
    .waitForFunction(
      expectedPreviousVideoId => {
        try {
          const current = new URL(window.location.href).searchParams.get('v')
          return Boolean(current && current !== expectedPreviousVideoId)
        } catch {
          return false
        }
      },
      previousVideoId,
      { timeout },
    )
    .then(
      () => page.evaluate(getCurrentVideoId),
      () => null,
    )
}

const clickNextButton = async (page: Page) => {
  await page.locator('#movie_player').hover()
  const nextButton = page.locator('.ytp-next-button').first()
  const visible = await nextButton.isVisible({ timeout: 5000 }).catch(() => false)
  if (!visible) return false

  const disabled = await nextButton.getAttribute('aria-disabled')
  if (disabled === 'true') return false

  return nextButton.click().then(
    () => true,
    () =>
      nextButton.click({ force: true }).then(
        () => true,
        () => false,
      ),
  )
}

const clickPlaylistTarget = async (page: Page, targetVideoId: string) => {
  const selectors = [
    `ytd-playlist-panel-video-renderer a[href*="/watch?v=${targetVideoId}"]`,
    `#playlist ytd-playlist-panel-video-renderer a[href*="v=${targetVideoId}"]`,
  ]

  for (const selector of selectors) {
    const link = page.locator(selector).first()
    const visible = await link.isVisible({ timeout: 3000 }).catch(() => false)
    if (!visible) continue
    const clicked = await link.click().then(
      () => true,
      () =>
        link.click({ force: true }).then(
          () => true,
          () => false,
        ),
    )
    if (clicked) return true
  }

  return false
}

const navigateToTransitionTarget = async (
  page: Page,
  options: {
    previousVideoId: string
    targetVideoId: string
    targetUrl: string
  },
) => {
  const { previousVideoId, targetVideoId, targetUrl } = options

  const clickedNext = await clickNextButton(page)
  if (clickedNext) {
    const changedWithNext = await waitForVideoIdChange(page, previousVideoId, NAVIGATION_SETTLE_TIMEOUT_MS)
    if (changedWithNext) return changedWithNext
  }

  const clickedPlaylist = await clickPlaylistTarget(page, targetVideoId)
  if (clickedPlaylist) {
    const reachedConfiguredTarget = await waitForVideoId(page, targetVideoId, NAVIGATION_SETTLE_TIMEOUT_MS)
    if (reachedConfiguredTarget) return targetVideoId
  }

  const changedAfterUiFallback = await waitForVideoIdChange(page, previousVideoId, NAVIGATION_SETTLE_TIMEOUT_MS)
  if (changedAfterUiFallback) return changedAfterUiFallback

  const navigatedWithLocation = await page
    .goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: NAVIGATION_SETTLE_TIMEOUT_MS,
    })
    .then(
      () => true,
      () => false,
    )
  if (!navigatedWithLocation) return null

  const reachedConfiguredTarget = await waitForVideoId(page, targetVideoId, NAVIGATION_SETTLE_TIMEOUT_MS)
  if (reachedConfiguredTarget) return targetVideoId
  return waitForVideoIdChange(page, previousVideoId, NAVIGATION_SETTLE_TIMEOUT_MS)
}

test.describe('fullscreen chat video transition', { tag: '@archive' }, () => {
  test('does not keep stale fullscreen chat iframe after video transition', async ({ page }) => {
    test.setTimeout(150000)

    const transitionPair = await selectArchiveReplayTransitionPair(page, { maxDurationMs: 90000 })
    if (!transitionPair) {
      await captureChatState(page, test.info(), 'video-transition-pair-selection-failed')
      test.skip(true, 'No archive replay transition pair satisfied preconditions.')
      return
    }
    const { fromUrl, toUrl } = transitionPair
    const archiveReady = await openArchiveWatchPage(page, fromUrl, { maxDurationMs: 30000 })
    if (!archiveReady) {
      await captureChatState(page, test.info(), 'video-transition-archive-precondition-missing')
      test.skip(true, 'Selected archive source URL did not expose archive chat container in time.')
      return
    }

    const selectedVideoId = extractVideoId(fromUrl)
    const transitionTargetId = extractVideoId(toUrl)
    if (!selectedVideoId || !transitionTargetId || transitionTargetId === selectedVideoId) {
      throw new Error('Archive transition target selection returned an invalid video pair.')
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)

    const fullscreenReady = await meetsExternalYouTubePrecondition('fullscreen-ui', () => yt.enterFullscreen())
    if (!fullscreenReady) {
      await captureChatState(page, test.info(), 'video-transition-fullscreen-precondition-missing')
      test.skip(true, 'YouTube fullscreen UI did not meet the canary precondition.')
      return
    }

    await overlay.expectSwitchReady()
    await overlay.toggleOn()
    await overlay.expectArchiveChatPlayable()

    const beforeTransition = await page.evaluate(getOverlayState)
    expect(beforeTransition.hasIframe).toBe(true)
    expect(beforeTransition.href).toBeTruthy()

    const transitionedVideoId = await navigateToTransitionTarget(page, {
      previousVideoId: selectedVideoId,
      targetVideoId: transitionTargetId,
      targetUrl: toUrl,
    })
    if (!transitionedVideoId) {
      await captureChatState(page, test.info(), 'video-transition-navigation-failed')
      test.skip(true, 'Could not navigate to another video via YouTube UI.')
      return
    }

    const fullscreenStillActive = await meetsExternalYouTubePrecondition('fullscreen-ui', () => yt.expectFullscreen())
    if (!fullscreenStillActive) {
      await captureChatState(page, test.info(), 'video-transition-fullscreen-lost')
      test.skip(true, 'Could not keep or restore fullscreen during transition navigation.')
      return
    }

    const currentVideoId = await page.evaluate(getCurrentVideoId)
    if (currentVideoId !== transitionedVideoId) {
      await captureChatState(page, test.info(), 'video-transition-target-mismatch')
      test.skip(true, 'Navigated video ID did not stabilize after transition.')
      return
    }

    await expect
      .poll(
        async () => {
          const state = await page.evaluate(getOverlayState)
          return state.pageVideoId === transitionedVideoId
        },
        { timeout: 20000 },
      )
      .toBe(true)

    await expect
      .poll(
        async () => {
          const state = await page.evaluate(getOverlayState)
          if (state.pageVideoId !== transitionedVideoId) return false
          if (!state.hasIframe) return true
          if (!state.href || state.href.includes('about:blank')) return true
          return state.href !== beforeTransition.href
        },
        { timeout: 20000 },
      )
      .toBe(true)
  })
})
