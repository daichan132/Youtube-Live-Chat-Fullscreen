import { expect, test } from '../../fixtures'
import { captureChatState, isExtensionArchiveChatPlayable, openArchiveWatchPage, shouldSkipArchiveFlowFailure } from '../../support/diagnostics'
import { selectArchiveReplayTransitionPair } from '../../support/urls/archiveReplay'
import { reliableClick } from '../../utils/actions'
import {
  switchButtonSelector,
} from '../../utils/selectors'

const TRANSITION_STABILITY_DURATION_MS = 4000
const TRANSITION_STABILITY_SAMPLE_INTERVAL_MS = 250
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

const extractVideoId = (url: string) => {
  try {
    return new URL(url).searchParams.get('v')
  } catch {
    return null
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

const waitForVideoId = async (page: import('@playwright/test').Page, videoId: string, timeout: number) => {
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
    .then(() => true, () => false)
}

const waitForVideoIdChange = async (page: import('@playwright/test').Page, previousVideoId: string, timeout: number) => {
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
    .then(() => page.evaluate(getCurrentVideoId), () => null)
}

const clickNextButton = async (page: import('@playwright/test').Page) => {
  await page.locator('#movie_player').hover()
  const nextButton = page.locator('.ytp-next-button').first()
  const visible = await nextButton.isVisible({ timeout: 5000 }).catch(() => false)
  if (!visible) return false

  const disabled = await nextButton.getAttribute('aria-disabled')
  if (disabled === 'true') return false

  await nextButton.click({ force: true }).catch(() => null)
  await page.evaluate(() => {
    const button = document.querySelector('.ytp-next-button') as HTMLElement | null
    button?.click()
  })
  return true
}

const clickPlaylistTarget = async (page: import('@playwright/test').Page, targetVideoId: string) => {
  const selectors = [
    `ytd-playlist-panel-video-renderer a[href*="/watch?v=${targetVideoId}"]`,
    `#playlist ytd-playlist-panel-video-renderer a[href*="v=${targetVideoId}"]`,
  ]

  for (const selector of selectors) {
    const link = page.locator(selector).first()
    const visible = await link.isVisible({ timeout: 3000 }).catch(() => false)
    if (!visible) continue
    await link.click({ force: true }).catch(() => null)
    return true
  }

  return false
}

const navigateToTransitionTarget = async (
  page: import('@playwright/test').Page,
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
    .then(() => true, () => false)
  if (!navigatedWithLocation) return null

  const reachedConfiguredTarget = await waitForVideoId(page, targetVideoId, NAVIGATION_SETTLE_TIMEOUT_MS)
  if (reachedConfiguredTarget) return targetVideoId
  return waitForVideoIdChange(page, previousVideoId, NAVIGATION_SETTLE_TIMEOUT_MS)
}

const ensureFullscreen = async (page: import('@playwright/test').Page) => {
  const active = await page.evaluate(() => document.fullscreenElement !== null)
  if (active) return true

  const playerReady = await page.waitForSelector('#movie_player', { state: 'attached', timeout: 8000 }).then(
    () => true,
    () => false,
  )
  if (!playerReady) return false

  await page.locator('#movie_player').hover()
  const fullscreenButton = page.locator('button.ytp-fullscreen-button').first()
  const buttonVisible = await fullscreenButton.isVisible({ timeout: 4000 }).catch(() => false)
  if (!buttonVisible) return false

  await fullscreenButton.click({ force: true })
  return page.waitForFunction(() => document.fullscreenElement !== null, { timeout: 8000 }).then(
    () => true,
    () => false,
  )
}

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
  if (!selectedVideoId) {
    test.skip(true, 'Could not resolve source video ID from transition pair.')
    return
  }
  if (!transitionTargetId) {
    test.skip(true, 'Could not resolve a target video ID from transition pair.')
    return
  }

  if (selectedVideoId && transitionTargetId === selectedVideoId) {
    test.skip(true, 'Transition pair must point to two different videos.')
    return
  }

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null, { timeout: 8000 })

  await page.locator('#movie_player').hover()
  const switchButton = page.locator(switchButtonSelector)
  const switchReady = await switchButton.waitFor({ state: 'visible', timeout: 10000 }).then(
    () => true,
    () => false,
  )
  if (!switchReady) {
    await captureChatState(page, test.info(), 'video-transition-switch-missing')
    test.skip(true, 'Fullscreen chat switch button did not appear.')
    return
  }
  if ((await switchButton.getAttribute('aria-pressed')) !== 'true') {
    await reliableClick(switchButton, page, switchButtonSelector)
    await expect(switchButton).toHaveAttribute('aria-pressed', 'true')
  }

  let extensionReady = false
  try {
    await expect.poll(async () => page.evaluate(isExtensionArchiveChatPlayable), { timeout: 60000 }).toBe(true)
    extensionReady = true
  } catch {
    extensionReady = false
  }

  if (!extensionReady) {
    const state = await captureChatState(page, test.info(), 'video-transition-extension-unready')
    if (shouldSkipArchiveFlowFailure(state)) {
      test.skip(true, 'Archive chat source did not become ready in this run.')
      return
    }
    expect(extensionReady).toBe(true)
  }

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

  const fullscreenStillActive = await ensureFullscreen(page)
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

  const sampleCount = Math.ceil(TRANSITION_STABILITY_DURATION_MS / TRANSITION_STABILITY_SAMPLE_INTERVAL_MS)
  for (let index = 0; index < sampleCount; index += 1) {
    const state = await page.evaluate(getOverlayState)
    const staleOverlayVisible =
      state.pageVideoId === transitionedVideoId &&
      state.hasIframe &&
      Boolean(state.href) &&
      !state.href.includes('about:blank') &&
      state.href === beforeTransition.href
    expect(staleOverlayVisible).toBe(false)
    await page.waitForTimeout(TRANSITION_STABILITY_SAMPLE_INTERVAL_MS)
  }
})
