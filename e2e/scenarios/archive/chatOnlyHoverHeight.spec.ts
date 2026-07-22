import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import {
  expectContinuousChatOnlyMotion,
  getChatOnlyChromeCollapseSnapshot,
  getOverlayCenter,
  installChatOnlyMotionProbe,
  isChatOnlyChromeHidden,
  movePointerAwayFromOverlay,
  readChatOnlyMotionProbe,
  setPersistedChatOnlyMode,
} from '@e2e/screenshots/helpers'
import { captureChatState, openArchiveWatchPage, shouldSkipArchiveFlowFailure } from '@e2e/support/diagnostics'
import type { Page } from '@playwright/test'

type OverlayChatSurfaceSnapshot = {
  exists: boolean
  carrierMatchesViewport: boolean
  carrierTopDelta: number
  carrierHeightDelta: number
  carrierWidthDelta: number
  carrierHeight: number
  height: number
  visibleHeight: number
  width: number
}

type HoverProbeState = {
  enterCount: number
  leaveCount: number
}

const getOverlayChatSurfaceSnapshot = (): OverlayChatSurfaceSnapshot => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const app = root?.querySelector('div[role="application"]') as HTMLElement | null
  const resizable = app?.querySelector(':scope > [data-ylc-resizable]') as HTMLElement | null
  const viewport = resizable?.querySelector('[data-ylc-chat-viewport]') as HTMLElement | null
  const carrier = resizable?.querySelector('[data-ylc-iframe-carrier]') as HTMLElement | null
  if (!resizable || !viewport || !carrier) {
    return {
      exists: false,
      carrierMatchesViewport: false,
      carrierTopDelta: 0,
      carrierHeightDelta: 0,
      carrierWidthDelta: 0,
      carrierHeight: 0,
      height: 0,
      visibleHeight: 0,
      width: 0,
    }
  }

  const box = resizable.getBoundingClientRect()
  const viewportBox = viewport.getBoundingClientRect()
  const carrierBox = carrier.getBoundingClientRect()
  const carrierTopDelta = Math.abs(carrierBox.top - viewportBox.top)
  const carrierHeightDelta = Math.abs(carrierBox.height - viewportBox.height)
  const carrierWidthDelta = Math.abs(carrierBox.width - viewportBox.width)

  return {
    exists: true,
    carrierMatchesViewport: carrierTopDelta <= 1 && carrierHeightDelta <= 1 && carrierWidthDelta <= 1,
    carrierTopDelta: Math.round(carrierTopDelta * 100) / 100,
    carrierHeightDelta: Math.round(carrierHeightDelta * 100) / 100,
    carrierWidthDelta: Math.round(carrierWidthDelta * 100) / 100,
    carrierHeight: Math.round(carrierBox.height * 100) / 100,
    height: Math.round(box.height * 100) / 100,
    visibleHeight: Math.round(viewportBox.height * 100) / 100,
    width: Math.round(box.width * 100) / 100,
  }
}

const installOverlayHoverProbe = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const app = root?.querySelector('div[role="application"]') as HTMLElement | null
  if (!app) return false

  const win = window as typeof window & {
    __ylcHoverProbe?: HoverProbeState
    __ylcHoverProbeCleanup?: () => void
  }

  win.__ylcHoverProbeCleanup?.()

  const state: HoverProbeState = { enterCount: 0, leaveCount: 0 }
  const handleEnter = () => {
    state.enterCount += 1
  }
  const handleLeave = () => {
    state.leaveCount += 1
  }

  app.addEventListener('mouseenter', handleEnter)
  app.addEventListener('mouseleave', handleLeave)

  win.__ylcHoverProbe = state
  win.__ylcHoverProbeCleanup = () => {
    app.removeEventListener('mouseenter', handleEnter)
    app.removeEventListener('mouseleave', handleLeave)
  }

  return true
}

const readOverlayHoverProbe = () => {
  const win = window as typeof window & {
    __ylcHoverProbe?: HoverProbeState
  }
  return win.__ylcHoverProbe ?? null
}

const sampleOverlayVisibleHeights = async ({
  sampleCount,
  intervalMs,
  settleMs = 0,
}: {
  sampleCount: number
  intervalMs: number
  settleMs?: number
}) => {
  const readVisibleHeight = () => {
    const host = document.getElementById('shadow-root-live-chat')
    const root = host?.shadowRoot ?? null
    const app = root?.querySelector('div[role="application"]') as HTMLElement | null
    const resizable = app?.querySelector(':scope > [data-ylc-resizable]') as HTMLElement | null
    const viewport = resizable?.querySelector('[data-ylc-chat-viewport]') as HTMLElement | null
    if (!viewport) return 0

    const box = viewport.getBoundingClientRect()
    return Math.round(box.height * 100) / 100
  }

  const values: number[] = []
  if (settleMs > 0) {
    await new Promise(resolve => window.setTimeout(resolve, settleMs))
  }
  for (let i = 0; i < sampleCount; i += 1) {
    values.push(readVisibleHeight())
    await new Promise(resolve => window.setTimeout(resolve, intervalMs))
  }

  const min = values.length > 0 ? Math.min(...values) : 0
  const max = values.length > 0 ? Math.max(...values) : 0
  const sorted = [...values].sort((a, b) => a - b)
  const median =
    sorted.length === 0
      ? 0
      : sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : Math.round(((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) * 100) / 100

  return {
    values,
    min,
    max,
    median,
    drift: Math.round((max - min) * 100) / 100,
  }
}

const collectStableVisibleHeightSamples = async (
  page: Page,
  {
    sampleCount,
    intervalMs,
    settleMs = 0,
    timeoutMs = 10000,
    maxDrift = 1.5,
  }: {
    sampleCount: number
    intervalMs: number
    settleMs?: number
    timeoutMs?: number
    maxDrift?: number
  },
) => {
  let samples = await page.evaluate(sampleOverlayVisibleHeights, { sampleCount, intervalMs, settleMs })
  await expect
    .poll(
      async () => {
        samples = await page.evaluate(sampleOverlayVisibleHeights, { sampleCount, intervalMs, settleMs })
        return samples.drift
      },
      { timeout: timeoutMs },
    )
    .toBeLessThanOrEqual(maxDrift)
  return samples
}

const openArchiveOverlayWithExtensionChat = async (page: Page, archiveReplayUrl: string | null) => {
  if (!archiveReplayUrl) {
    await captureChatState(page, test.info(), 'chat-only-chrome-url-selection-failed')
    test.skip(true, 'No archive replay URL satisfied preconditions.')
    return false
  }

  const archiveReady = await openArchiveWatchPage(page, archiveReplayUrl, { maxDurationMs: 30000 })
  if (!archiveReady) {
    await captureChatState(page, test.info(), 'chat-only-chrome-precondition-missing')
    test.skip(true, 'Selected archive URL did not expose archive chat container in time.')
    return false
  }

  const yt = new YouTubeWatchPage(page)
  const overlay = new ExtensionOverlay(page)

  try {
    await yt.enterFullscreen()
  } catch (error) {
    await captureChatState(page, test.info(), 'chat-only-chrome-fullscreen-failed').catch(() => null)
    test.skip(true, `Fullscreen entry failed (browser may have closed): ${error instanceof Error ? error.message : String(error)}`)
    return false
  }

  const switchReady = await overlay.waitForSwitchReady()
  if (!switchReady) {
    await captureChatState(page, test.info(), 'chat-only-chrome-switch-missing')
    test.skip(true, 'Fullscreen chat switch button did not appear.')
    return false
  }

  await overlay.toggleOn()

  const extensionReady = await overlay.waitForArchiveChatPlayable()
  if (!extensionReady) {
    const state = await captureChatState(page, test.info(), 'chat-only-chrome-extension-unready')
    if (shouldSkipArchiveFlowFailure(state)) {
      test.skip(true, 'Archive chat source did not become ready in this run.')
      return false
    }
    expect(extensionReady).toBe(true)
  }

  const appLocator = page.locator('#shadow-root-live-chat div[role="application"]').first()
  const appVisible = await appLocator.waitFor({ state: 'visible', timeout: 10000 }).then(
    () => true,
    () => false,
  )
  if (!appVisible) {
    test.skip(true, 'Overlay app container did not appear.')
    return false
  }

  return true
}

test.describe('chat-only hover height', { tag: '@archive' }, () => {
  test('chat-only chrome hides after load without any overlay hover', async ({ page, extension, archiveReplayUrl }) => {
    test.setTimeout(180000)

    const configured = await setPersistedChatOnlyMode(extension)
    expect(configured).toBe(true)

    const ready = await openArchiveOverlayWithExtensionChat(page, archiveReplayUrl)
    if (!ready) return

    const movedAway = await movePointerAwayFromOverlay(page)
    if (!movedAway) {
      test.skip(true, 'Viewport was unavailable.')
      return
    }

    const probeInstalled = await page.evaluate(installOverlayHoverProbe)
    expect(probeInstalled).toBe(true)

    await expect.poll(async () => page.evaluate(isChatOnlyChromeHidden), { timeout: 15000 }).toBe(true)
    await expect
      .poll(async () => page.evaluate(getChatOnlyChromeCollapseSnapshot).then(result => result.allTargetsCollapsed), { timeout: 15000 })
      .toBe(true)
    await expect
      .poll(
        async () => {
          const surfaceSnapshot = await page.evaluate(getOverlayChatSurfaceSnapshot)
          return surfaceSnapshot.exists && surfaceSnapshot.carrierMatchesViewport
        },
        { timeout: 15000 },
      )
      .toBe(true)

    const snapshot = await page.evaluate(getOverlayChatSurfaceSnapshot)
    const chromeSnapshot = await page.evaluate(getChatOnlyChromeCollapseSnapshot)
    const immediateVisibleHeightSamples = await collectStableVisibleHeightSamples(page, {
      sampleCount: 4,
      intervalMs: 60,
      settleMs: 300,
      timeoutMs: 12000,
    })
    const visibleHeightSamples = await collectStableVisibleHeightSamples(page, {
      sampleCount: 6,
      intervalMs: 180,
      settleMs: 350,
    })
    const hoverProbe = await page.evaluate(readOverlayHoverProbe)

    await test.info().attach('chat-only-chrome-no-hover', {
      body: JSON.stringify({ snapshot, chromeSnapshot, immediateVisibleHeightSamples, visibleHeightSamples, hoverProbe }, null, 2),
      contentType: 'application/json',
    })

    expect(snapshot.exists).toBe(true)
    expect(snapshot.carrierMatchesViewport).toBe(true)
    expect(chromeSnapshot.allTargetsCollapsed).toBe(true)
    expect(immediateVisibleHeightSamples.drift).toBeLessThanOrEqual(1.5)
    expect(visibleHeightSamples.drift).toBeLessThanOrEqual(1.5)
    expect(hoverProbe?.enterCount ?? -1).toBe(0)
  })

  test('chat-only chrome expands on first hover and re-hides after pointer leave', async ({ page, extension, archiveReplayUrl }) => {
    test.setTimeout(180000)

    const configured = await setPersistedChatOnlyMode(extension)
    expect(configured).toBe(true)

    const ready = await openArchiveOverlayWithExtensionChat(page, archiveReplayUrl)
    if (!ready) return

    const movedAway = await movePointerAwayFromOverlay(page)
    if (!movedAway) {
      test.skip(true, 'Viewport was unavailable.')
      return
    }

    const probeInstalled = await page.evaluate(installOverlayHoverProbe)
    expect(probeInstalled).toBe(true)

    await expect.poll(async () => page.evaluate(isChatOnlyChromeHidden), { timeout: 15000 }).toBe(true)
    await expect
      .poll(async () => page.evaluate(getChatOnlyChromeCollapseSnapshot).then(result => result.allTargetsCollapsed), { timeout: 15000 })
      .toBe(true)
    const baselineVisibleHeightSamples = await collectStableVisibleHeightSamples(page, {
      sampleCount: 6,
      intervalMs: 180,
      settleMs: 350,
    })
    const baselineSnapshot = await page.evaluate(getOverlayChatSurfaceSnapshot)
    const baselineChromeSnapshot = await page.evaluate(getChatOnlyChromeCollapseSnapshot)

    const center = await page.evaluate(getOverlayCenter)
    if (!center) {
      test.skip(true, 'Overlay center could not be resolved.')
      return
    }

    expect(await page.evaluate(installChatOnlyMotionProbe)).toBe(true)
    await page.mouse.move(center.x, center.y)

    await expect.poll(async () => page.evaluate(isChatOnlyChromeHidden), { timeout: 15000 }).toBe(false)
    await expect
      .poll(async () => page.evaluate(getChatOnlyChromeCollapseSnapshot).then(result => result.allTargetsCollapsed), { timeout: 15000 })
      .toBe(false)
    const expandedChromeSnapshot = await page.evaluate(getChatOnlyChromeCollapseSnapshot)
    await expect.poll(async () => page.evaluate(readChatOnlyMotionProbe).then(probe => probe?.done ?? false), { timeout: 2000 }).toBe(true)
    const expansionMotion = await page.evaluate(readChatOnlyMotionProbe)
    expectContinuousChatOnlyMotion(expansionMotion, 'expanding')

    expect(await page.evaluate(installChatOnlyMotionProbe)).toBe(true)
    await movePointerAwayFromOverlay(page)
    await expect.poll(async () => page.evaluate(isChatOnlyChromeHidden), { timeout: 15000 }).toBe(true)
    await expect
      .poll(async () => page.evaluate(getChatOnlyChromeCollapseSnapshot).then(result => result.allTargetsCollapsed), { timeout: 15000 })
      .toBe(true)
    await expect.poll(async () => page.evaluate(readChatOnlyMotionProbe).then(probe => probe?.done ?? false), { timeout: 2000 }).toBe(true)
    const collapseMotion = await page.evaluate(readChatOnlyMotionProbe)
    expectContinuousChatOnlyMotion(collapseMotion, 'collapsing')

    const snapshot = await page.evaluate(getOverlayChatSurfaceSnapshot)
    const chromeSnapshot = await page.evaluate(getChatOnlyChromeCollapseSnapshot)
    const visibleHeightSamplesAfterHover = await collectStableVisibleHeightSamples(page, {
      sampleCount: 6,
      intervalMs: 180,
      settleMs: 350,
    })
    const hoverProbe = await page.evaluate(readOverlayHoverProbe)
    const visibleHeightDelta = visibleHeightSamplesAfterHover.median - baselineVisibleHeightSamples.median

    await test.info().attach('chat-only-chrome-hovered-once', {
      body: JSON.stringify(
        {
          baselineSnapshot,
          baselineChromeSnapshot,
          baselineVisibleHeightSamples,
          expandedChromeSnapshot,
          expansionMotion,
          collapseMotion,
          snapshot,
          chromeSnapshot,
          visibleHeightSamplesAfterHover,
          visibleHeightDelta,
          hoverProbe,
          center,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    })

    expect(snapshot.exists).toBe(true)
    expect(baselineSnapshot.carrierMatchesViewport).toBe(true)
    expect(snapshot.carrierMatchesViewport).toBe(true)
    expect(baselineChromeSnapshot.allTargetsCollapsed).toBe(true)
    expect(expandedChromeSnapshot.hidden).toBe(false)
    expect(expandedChromeSnapshot.allTargetsCollapsed).toBe(false)
    expect(chromeSnapshot.allTargetsCollapsed).toBe(true)
    expect(baselineVisibleHeightSamples.drift).toBeLessThanOrEqual(1.5)
    expect(visibleHeightSamplesAfterHover.drift).toBeLessThanOrEqual(1.5)
    // Allow content-driven growth: archive chat messages load dynamically between
    // baseline (pre-hover) and post-hover snapshot, increasing visible height.
    const maxGrowth = Math.max(2, baselineSnapshot.height * 0.15)
    const maxShrink = Math.max(8, baselineSnapshot.height * 0.03)
    expect(visibleHeightDelta).toBeLessThanOrEqual(maxGrowth)
    expect(visibleHeightDelta).toBeGreaterThanOrEqual(-maxShrink)
    expect((hoverProbe?.enterCount ?? 0) > 0).toBe(true)
  })
})
