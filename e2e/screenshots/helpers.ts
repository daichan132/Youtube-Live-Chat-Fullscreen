import fs from 'node:fs'
import path from 'node:path'
import type { Extension } from '@e2e/fixtures'
import { TIMING } from '@e2e/support/constants'
import { ensureArchiveNativeChatPlayable, isExtensionArchiveChatPlayable, openArchiveWatchPage } from '@e2e/support/diagnostics'
import { reliableClick } from '@e2e/utils/actions'
import { switchButtonSelector } from '@e2e/utils/selectors'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Screenshot-dedicated archive URL (with chat replay).
 * Separate from E2E testTargets so promotional screenshots use a safe, curated video.
 * hololive production COUNTDOWN LIVE 2024▷2025 — official free concert, 60 talents.
 * &t=1800 skips to ~30min in (middle of performances).
 */
export const SCREENSHOT_ARCHIVE_URL = 'https://www.youtube.com/watch?v=k8Jjwu3YwPo&t=1800'

export const screenshotDir = () => path.resolve('screenshots')

export const ensureScreenshotsDir = () => {
  const dir = screenshotDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export const screenshotPath = (name: string) => path.join(screenshotDir(), `${name}.png`)

export const seekVideo = async (page: Page, seconds: number) => {
  await page.evaluate(s => {
    const player = document.getElementById('movie_player') as HTMLElement & { seekTo?: (t: number, allowSeekAhead: boolean) => void }
    player?.seekTo?.(s, true)
  }, seconds)
  await page.waitForTimeout(TIMING.SEEK_STABILIZE_MS)
}

export const pauseVideo = async (page: Page) => {
  await page.evaluate(() => {
    const video = document.querySelector('video')
    if (video && !video.paused) video.pause()
  })
}

export const setTheme = async (page: Page, extension: Extension, themeMode: 'light' | 'dark') => {
  await page.goto(extension.url('popup.html'), { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.getByLabel('Select language').waitFor({ state: 'visible', timeout: 15000 })

  const themeSelect = page.getByLabel('Theme')
  await themeSelect.selectOption(themeMode)
  await page.locator(`[data-ylc-theme="${themeMode}"]`).waitFor({ state: 'visible', timeout: 5000 })
}

export const enterFullscreenWithChat = async (page: Page) => {
  const archiveReady = await openArchiveWatchPage(page, SCREENSHOT_ARCHIVE_URL, { maxDurationMs: 30000 })
  if (!archiveReady) return false

  const nativeReady = await ensureArchiveNativeChatPlayable(page, { maxDurationMs: 30000 })
  if (!nativeReady) return false

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null, undefined, { timeout: 8000 })
  await page.locator('#movie_player').hover()

  const switchButton = page.locator(switchButtonSelector)
  const switchReady = await switchButton.waitFor({ state: 'visible', timeout: 10000 }).then(
    () => true,
    () => false,
  )
  if (!switchReady) return false

  try {
    if ((await switchButton.getAttribute('aria-pressed')) !== 'true') {
      await reliableClick(switchButton, async () => (await switchButton.getAttribute('aria-pressed')) === 'true', { allowJsFallback: true })
    }
    await page.waitForFunction(isExtensionArchiveChatPlayable, undefined, { timeout: 60000 })
  } catch {
    return false
  }

  return true
}

export const waitForAdsToFinish = async (page: Page, options: { maxDurationMs?: number } = {}) => {
  const { maxDurationMs = 60000 } = options
  const deadline = Date.now() + maxDurationMs

  while (Date.now() < deadline) {
    const isAdPlaying = await page.evaluate(() => {
      const player = document.getElementById('movie_player')
      if (!player) return false
      if (player.classList.contains('ad-showing')) return true
      if (player.querySelector('.ytp-ad-player-overlay')) return true
      return false
    })
    if (!isAdPlaying) return

    // Try to click skip button if available
    await page
      .evaluate(() => {
        const selectors = [
          '.ytp-skip-ad-button',
          '.ytp-ad-skip-button',
          '.ytp-ad-skip-button-modern',
          'button.ytp-ad-skip-button-modern',
          '.ytp-skip-ad .ytp-skip-ad-button',
        ]
        for (const selector of selectors) {
          const button = document.querySelector<HTMLElement>(selector)
          if (button && button.offsetParent !== null) {
            button.click()
            return true
          }
        }
        return false
      })
      .catch(() => false)

    await page.waitForTimeout(TIMING.AD_CHECK_POLL_INTERVAL_MS)
  }
}

export const clickSettingIcon = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  if (!root) return false

  const candidates = Array.from(root.querySelectorAll<HTMLElement>('.ylc-overlay-control-icon'))
  const settingsButton = candidates[1] ?? candidates[0] ?? null
  if (!settingsButton) return false

  settingsButton.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
  return true
}

export const hoverOverlay = async (page: Page) => {
  const appLocator = page.locator('#shadow-root-live-chat div[role="application"]').first()
  const appVisible = await appLocator.waitFor({ state: 'visible', timeout: 10000 }).then(
    () => true,
    () => false,
  )
  if (!appVisible) return false

  const appBox = await appLocator.boundingBox()
  if (!appBox) return false
  await page.mouse.move(appBox.x + appBox.width / 2, appBox.y + Math.min(appBox.height / 2, 100))
  await page.waitForTimeout(TIMING.OVERLAY_HOVER_ANIMATION_MS)
  return true
}

// --- Chat message diagnostics & polling ---

export type ChatMessageDiagnostics = {
  iframeExists: boolean
  iframeSrc: string
  hasRenderer: boolean
  hasItemList: boolean
  messageCount: number
  isUnavailable: boolean
}

export const getChatMessageDiagnostics = (): ChatMessageDiagnostics => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return { iframeExists: false, iframeSrc: '', hasRenderer: false, hasItemList: false, messageCount: 0, isUnavailable: false }

  const doc = iframe.contentDocument ?? null
  const src = iframe.getAttribute('src') ?? iframe.src ?? ''
  if (!doc) return { iframeExists: true, iframeSrc: src, hasRenderer: false, hasItemList: false, messageCount: 0, isUnavailable: false }

  const hasRenderer = Boolean(doc.querySelector('yt-live-chat-renderer'))
  const hasItemList = Boolean(doc.querySelector('yt-live-chat-item-list-renderer'))
  const isUnavailable = Boolean(doc.querySelector('yt-live-chat-unavailable-message-renderer'))
  const items = doc.querySelectorAll('#items yt-live-chat-text-message-renderer')

  return { iframeExists: true, iframeSrc: src, hasRenderer, hasItemList, messageCount: items.length, isUnavailable }
}

type WaitForChatMessagesOptions = { timeoutMs?: number; minMessageCount?: number }

export const waitForChatMessages = async (
  page: Page,
  options: WaitForChatMessagesOptions = {},
): Promise<{ success: boolean; diagnostics: ChatMessageDiagnostics }> => {
  const { timeoutMs = 30000, minMessageCount = 1 } = options
  let lastDiag: ChatMessageDiagnostics = {
    iframeExists: false,
    iframeSrc: '',
    hasRenderer: false,
    hasItemList: false,
    messageCount: 0,
    isUnavailable: false,
  }

  try {
    await expect
      .poll(
        async () => {
          lastDiag = await page.evaluate(getChatMessageDiagnostics)
          return lastDiag.messageCount
        },
        { timeout: timeoutMs },
      )
      .toBeGreaterThanOrEqual(minMessageCount)
    return { success: true, diagnostics: lastDiag }
  } catch {
    return { success: false, diagnostics: lastDiag }
  }
}

// --- chat-only helpers ---

export const setPersistedChatOnlyMode = async (extension: Extension) => {
  const parsePersisted = (raw: unknown, fallbackVersion: number) => {
    if (typeof raw !== 'string' || raw.length === 0) {
      return { state: {} as Record<string, unknown>, version: fallbackVersion }
    }
    try {
      const parsed = JSON.parse(raw) as { state?: Record<string, unknown>; version?: number }
      return {
        state: parsed?.state && typeof parsed.state === 'object' ? parsed.state : {},
        version: typeof parsed?.version === 'number' ? parsed.version : fallbackVersion,
      }
    } catch {
      return { state: {} as Record<string, unknown>, version: fallbackVersion }
    }
  }

  const stores = await extension.storage.get(['ytdLiveChatStore', 'globalSettingStore'])
  const currentYlc = parsePersisted(stores.ytdLiveChatStore, 1)
  const currentGlobal = parsePersisted(stores.globalSettingStore, 0)

  await extension.storage.set({
    ytdLiveChatStore: JSON.stringify({
      state: { ...currentYlc.state, alwaysOnDisplay: true, chatOnlyDisplay: true },
      version: currentYlc.version,
    }),
    globalSettingStore: JSON.stringify({
      state: { ...currentGlobal.state, ytdLiveChat: true },
      version: currentGlobal.version,
    }),
  })

  return true
}

export const isChatOnlyChromeHidden = (): boolean => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('[data-ylc-chat="true"]') as HTMLIFrameElement | null
  return iframe?.contentDocument?.body.classList.contains('chat-only-display') ?? false
}

export const getOverlayCenter = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const app = host?.shadowRoot?.querySelector('div[role="application"]') as HTMLElement | null
  const resizable = app?.querySelector(':scope > [data-ylc-resizable]') as HTMLElement | null
  if (!resizable) return null

  const box = resizable.getBoundingClientRect()
  if (box.width <= 0 || box.height <= 0) return null
  return { x: Math.floor(box.left + box.width / 2), y: Math.floor(box.top + box.height / 2) }
}

export type ChatOnlyChromeCollapseSnapshot = {
  hidden: boolean
  allTargetsCollapsed: boolean
  targets: Array<{
    selector: string
    exists: boolean
    height: number
  }>
}

export const getChatOnlyChromeCollapseSnapshot = (): ChatOnlyChromeCollapseSnapshot => {
  const iframe = window.__ylcHelpers.getExtensionIframe()
  const body = iframe?.contentDocument?.body ?? null

  if (!body) {
    return {
      hidden: false,
      allTargetsCollapsed: false,
      targets: [
        { selector: 'yt-live-chat-header-renderer', exists: false, height: 0 },
        { selector: '#input-panel or outer input fallback', exists: false, height: 0 },
      ],
    }
  }

  const targets = window.__ylcHelpers.getChatOnlyChromeTargets().map(({ selector, element }) => ({
    selector,
    exists: true,
    height: Math.round(element.getBoundingClientRect().height * 100) / 100,
  }))
  const existingTargets = targets.filter(target => target.exists)

  return {
    hidden: body.classList.contains('chat-only-display'),
    allTargetsCollapsed: existingTargets.length > 0 && existingTargets.every(target => target.height <= 1),
    targets,
  }
}

export type ChatOnlyMotionProbeState = {
  done: boolean
  sawTransition: boolean
  timedOut: boolean
  samples: Array<{
    elapsedMs: number
    transitionReady: boolean
    hidden: boolean
    targets: Array<{ selector: string; height: number; naturalHeight: number }>
  }>
}

export const installChatOnlyMotionProbe = () => {
  const win = window as typeof window & {
    __ylcChatOnlyMotionProbe?: ChatOnlyMotionProbeState
    __ylcChatOnlyMotionProbeFrame?: number
  }
  if (win.__ylcChatOnlyMotionProbeFrame !== undefined) cancelAnimationFrame(win.__ylcChatOnlyMotionProbeFrame)

  const state: ChatOnlyMotionProbeState = { done: false, sawTransition: false, timedOut: false, samples: [] }
  const startedAt = performance.now()
  win.__ylcChatOnlyMotionProbe = state

  const sample = () => {
    const body = window.__ylcHelpers.getExtensionIframe()?.contentDocument?.body ?? null
    const transitionReady = body?.classList.contains('chat-only-transition-ready') ?? false
    state.sawTransition ||= transitionReady
    const elapsedMs = performance.now() - startedAt
    state.samples.push({
      elapsedMs: Math.round(elapsedMs * 100) / 100,
      transitionReady,
      hidden: body?.classList.contains('chat-only-display') ?? false,
      targets: window.__ylcHelpers.getChatOnlyChromeTargets().map(({ selector, element }) => {
        const height = Math.round(element.getBoundingClientRect().height * 100) / 100
        const measuredHeight = Number.parseFloat(element.style.getPropertyValue('--extension-chat-only-target-height')) || 0
        return { selector, height, naturalHeight: Math.max(height, measuredHeight) }
      }),
    })

    if (state.sawTransition && !transitionReady) {
      state.done = true
      win.__ylcChatOnlyMotionProbeFrame = undefined
      return
    }
    if (elapsedMs >= 1500) {
      state.done = true
      state.timedOut = true
      win.__ylcChatOnlyMotionProbeFrame = undefined
      return
    }
    win.__ylcChatOnlyMotionProbeFrame = requestAnimationFrame(sample)
  }

  sample()
  return true
}

export const readChatOnlyMotionProbe = () => {
  const win = window as typeof window & { __ylcChatOnlyMotionProbe?: ChatOnlyMotionProbeState }
  return win.__ylcChatOnlyMotionProbe ?? null
}

export const expectContinuousChatOnlyMotion = (
  probe: ChatOnlyMotionProbeState | null,
  direction: 'expanding' | 'collapsing',
  { requireInput = false }: { requireInput?: boolean } = {},
) => {
  expect(probe?.done).toBe(true)
  expect(probe?.sawTransition).toBe(true)
  expect(probe?.timedOut).toBe(false)
  const samples = probe?.samples ?? []
  expect(samples.at(-1)?.transitionReady).toBe(false)
  const baselineSelectors = new Set(
    samples[0]?.targets.filter(target => target.naturalHeight >= 4).map(target => target.selector) ?? [],
  )
  expect(baselineSelectors.has('header'), 'header should exist before the motion starts').toBe(true)
  if (requireInput) expect([...baselineSelectors].some(selector => selector.startsWith('input'))).toBe(true)

  const selectors = new Set(samples.flatMap(sample => sample.targets.map(target => target.selector)))
  const movingSelectors: string[] = []
  const movementWindows: Array<{ selector: string; startFrame: number; endFrame: number }> = []

  for (const selector of selectors) {
    const heights = samples
      .map(sample => sample.targets.find(target => target.selector === selector)?.height)
      .filter((height): height is number => height !== undefined)
    if (heights.length < 3) continue

    const min = Math.min(...heights)
    const max = Math.max(...heights)
    if (max - min < 4) continue
    movingSelectors.push(selector)

    const start = heights[0]
    const end = heights.at(-1) ?? start
    if (direction === 'expanding') {
      expect(start, `${selector} should start collapsed`).toBeLessThanOrEqual(1)
      expect(end, `${selector} should finish at its measured endpoint`).toBeGreaterThanOrEqual(max - 1)
    } else {
      expect(start, `${selector} should start expanded`).toBeGreaterThanOrEqual(max - 1)
      expect(end, `${selector} should finish collapsed`).toBeLessThanOrEqual(1)
    }

    let stagnantInteriorFrames = 0
    let longestStagnantInteriorRun = 0
    let startFrame = -1
    let endFrame = -1
    for (let index = 1; index < heights.length; index += 1) {
      const delta = heights[index] - heights[index - 1]
      if (direction === 'expanding') {
        expect(delta, `${selector} should not reverse while expanding`).toBeGreaterThanOrEqual(-1)
      } else {
        expect(delta, `${selector} should not reverse while collapsing`).toBeLessThanOrEqual(1)
      }

      const progress = (heights[index] - min) / (max - min)
      const directedProgress = direction === 'expanding' ? progress : 1 - progress
      if (startFrame === -1 && directedProgress >= 0.05) startFrame = index
      if (directedProgress <= 0.95) endFrame = index
      const isInterior = progress >= 0.05 && progress <= 0.95
      if (isInterior && Math.abs(delta) <= 0.15) {
        stagnantInteriorFrames += 1
        longestStagnantInteriorRun = Math.max(longestStagnantInteriorRun, stagnantInteriorFrames)
      } else {
        stagnantInteriorFrames = 0
      }
    }
    expect(longestStagnantInteriorRun, `${selector} should not pause midway through the transition`).toBeLessThanOrEqual(2)
    expect(startFrame, `${selector} should enter the motion interval`).toBeGreaterThanOrEqual(0)
    expect(endFrame, `${selector} should leave the motion interval`).toBeGreaterThanOrEqual(startFrame)
    movementWindows.push({ selector, startFrame, endFrame })
  }

  expect(movingSelectors.length).toBeGreaterThan(0)
  for (const selector of baselineSelectors) {
    expect(movingSelectors, `${selector} should traverse the full motion range`).toContain(selector)
  }

  if (movementWindows.length > 1) {
    const startFrames = movementWindows.map(window => window.startFrame)
    const endFrames = movementWindows.map(window => window.endFrame)
    expect(
      Math.max(...startFrames) - Math.min(...startFrames),
      `chat chrome targets should start together: ${JSON.stringify(movementWindows)}`,
    ).toBeLessThanOrEqual(2)
    expect(
      Math.max(...endFrames) - Math.min(...endFrames),
      `chat chrome targets should finish together: ${JSON.stringify(movementWindows)}`,
    ).toBeLessThanOrEqual(2)
  }
}

export const movePointerAwayFromOverlay = async (page: Page): Promise<boolean> => {
  const viewport = page.viewportSize()
  if (!viewport) return false
  await page.mouse.move(viewport.width - 20, 20)
  return true
}

/**
 * Wait for YouTube player controls (progress bar, buttons, etc.) to auto-hide.
 * YouTube adds `ytp-autohide` class to `#movie_player` when controls are hidden.
 */
export const waitForPlayerControlsHidden = async (page: Page, options: { timeoutMs?: number } = {}): Promise<boolean> => {
  const { timeoutMs = 15000 } = options
  try {
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const player = document.getElementById('movie_player')
            return player?.classList.contains('ytp-autohide') ?? false
          }),
        { timeout: timeoutMs },
      )
      .toBe(true)
    return true
  } catch {
    return false
  }
}

/**
 * Reposition and resize the overlay by directly setting CSS on the shadow DOM element.
 * Used for screenshots because patchOverlayStore coordinates/size are overwritten
 * by the popup's Zustand persist initialization race.
 */
export const repositionOverlay = async (
  page: Page,
  coordinates: { x: number; y: number },
  size: { width: number; height: number },
): Promise<boolean> => {
  return page.evaluate(
    ({ coords, sz }) => {
      const host = document.getElementById('shadow-root-live-chat')
      const root = host?.shadowRoot ?? null
      const app = root?.querySelector('div[role="application"]') as HTMLElement | null
      const resizable = app?.querySelector(':scope > div.absolute') as HTMLElement | null
      if (!resizable) return false
      resizable.style.left = `${coords.x}px`
      resizable.style.top = `${coords.y}px`
      resizable.style.width = `${sz.width}px`
      resizable.style.height = `${sz.height}px`
      return true
    },
    { coords: coordinates, sz: size },
  )
}

/**
 * Inject a persistent stylesheet to hide YouTube UI overlays for clean screenshots.
 * Uses <style> injection so rules survive YouTube's re-renders.
 */
export const hideYouTubeOverlays = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const id = '__ylc-screenshot-overlay-hide'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = [
      '.ytp-paid-content-overlay',
      '.ytp-overlay-top-left',
      '.ytp-ce-element',
      '.ytp-cards-button',
      '.ytp-cards-teaser',
      '.ytp-watermark',
      '.ytp-chrome-top',
      '.ytp-gradient-top',
      '.ytp-show-cards-title',
      '.ytp-suggested-action',
      '.ytp-overflow-panel-container',
      '.ytp-title',
      '.ytp-impression-link',
      '.iv-branding',
      '.branding-img-container',
      '.annotation',
    ]
      .map(s => `${s} { display: none !important; }`)
      .join('\n')
    document.head.appendChild(style)
  })
}
