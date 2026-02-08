import { expect, test } from '../../fixtures'
import { captureChatState, isExtensionArchiveChatPlayable, openArchiveWatchPage, shouldSkipArchiveFlowFailure } from '../../support/diagnostics'
import { selectArchiveReplayTransitionPair } from '../../support/urls/archiveReplay'
import { reliableClick } from '../../utils/actions'
import {
  switchButtonSelector,
} from '../../utils/selectors'

const TRANSITION_STABILITY_DURATION_MS = 4000
const TRANSITION_STABILITY_SAMPLE_INTERVAL_MS = 250

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

  await page.evaluate((nextVideoId) => {
    const watchFlexy = document.querySelector('ytd-watch-flexy')
    if (watchFlexy) watchFlexy.setAttribute('video-id', nextVideoId)

    const moviePlayer = document.getElementById('movie_player')
    if (moviePlayer) moviePlayer.setAttribute('video-id', nextVideoId)

    const nextUrl = `/watch?v=${nextVideoId}`
    window.history.pushState({}, '', nextUrl)
  }, transitionTargetId)

  await expect
    .poll(
      async () => {
        const state = await page.evaluate(getOverlayState)
        return state.pageVideoId === transitionTargetId
      },
      { timeout: 20000 },
    )
    .toBe(true)

  await expect
    .poll(
      async () => {
        const state = await page.evaluate(getOverlayState)
        if (state.pageVideoId !== transitionTargetId) return false
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
      state.pageVideoId === transitionTargetId &&
      state.hasIframe &&
      Boolean(state.href) &&
      !state.href.includes('about:blank') &&
      state.href === beforeTransition.href
    expect(staleOverlayVisible).toBe(false)
    await page.waitForTimeout(TRANSITION_STABILITY_SAMPLE_INTERVAL_MS)
  }
})
