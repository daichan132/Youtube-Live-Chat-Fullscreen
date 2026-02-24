import path from 'node:path'
import fs from 'node:fs'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { ensureArchiveNativeChatPlayable, isExtensionArchiveChatPlayable, openArchiveWatchPage } from '../support/diagnostics'
import { reliableClick } from '../utils/actions'
import { switchButtonSelector } from '../utils/selectors'

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

export { patchOverlayStore } from '../utils/storageHelper'

export const seekVideo = async (page: Page, seconds: number) => {
  await page.evaluate((s) => {
    const player = document.getElementById('movie_player') as HTMLElement & { seekTo?: (t: number, allowSeekAhead: boolean) => void }
    player?.seekTo?.(s, true)
  }, seconds)
  await page.waitForTimeout(2000)
}

export const pauseVideo = async (page: Page) => {
  await page.evaluate(() => {
    const video = document.querySelector('video')
    if (video && !video.paused) video.pause()
  })
}

export const setTheme = async (page: Page, extensionId: string, themeMode: 'light' | 'dark') => {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`
  await page.goto(popupUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
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
  await page.waitForFunction(() => document.fullscreenElement !== null, { timeout: 8000 })
  await page.locator('#movie_player').hover()

  const switchButton = page.locator(switchButtonSelector)
  const switchReady = await switchButton.waitFor({ state: 'visible', timeout: 10000 }).then(
    () => true,
    () => false,
  )
  if (!switchReady) return false

  if ((await switchButton.getAttribute('aria-pressed')) !== 'true') {
    await reliableClick(switchButton, page, switchButtonSelector)
  }

  try {
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

    await page.waitForTimeout(1000)
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
  await page.waitForTimeout(300)
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
  if (!iframe)
    return { iframeExists: false, iframeSrc: '', hasRenderer: false, hasItemList: false, messageCount: 0, isUnavailable: false }

  const doc = iframe.contentDocument ?? null
  const src = iframe.getAttribute('src') ?? iframe.src ?? ''
  if (!doc)
    return { iframeExists: true, iframeSrc: src, hasRenderer: false, hasItemList: false, messageCount: 0, isUnavailable: false }

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

// --- clip-path helpers (moved from chatOnlyHoverHeight.spec.ts) ---

export const isClipPathEnabled = (): boolean => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const app = root?.querySelector('div[role="application"]') as HTMLElement | null
  const resizable = app?.querySelector(':scope > div.absolute') as HTMLElement | null
  const inner = resizable?.querySelector(':scope > div.relative.h-full.w-full.pointer-events-auto') as HTMLElement | null
  if (!inner) return false
  const clipPath = window.getComputedStyle(inner).clipPath ?? ''
  const insetMatch = clipPath.match(/inset\(([-\d.]+)px\s+[-\d.]+px\s+([-\d.]+)px/i)
  const clipTop = insetMatch?.[1] ? Number.parseFloat(insetMatch[1]) : 0
  const clipBottom = insetMatch?.[2] ? Number.parseFloat(insetMatch[2]) : 0
  return clipTop > 0 || clipBottom > 0
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
      .map((s) => `${s} { display: none !important; }`)
      .join('\n')
    document.head.appendChild(style)
  })
}
