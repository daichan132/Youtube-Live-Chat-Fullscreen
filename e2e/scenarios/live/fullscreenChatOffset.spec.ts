import { writeFile } from 'node:fs/promises'
import { expect, test } from '../../fixtures'
import { ExtensionOverlay } from '../../pages/ExtensionOverlay'
import { YouTubeWatchPage } from '../../pages/YouTubeWatchPage'

const isNativeChatUsable = () => {
  const secondary = document.querySelector('#secondary') as HTMLElement | null
  const chatContainer = document.querySelector('#chat-container') as HTMLElement | null
  const chatFrameHost = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
  const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
  if (!secondary || !chatContainer || !chatFrameHost || !chatFrame) return false

  const secondaryStyle = window.getComputedStyle(secondary)
  const containerStyle = window.getComputedStyle(chatContainer)
  const hostStyle = window.getComputedStyle(chatFrameHost)
  const isHidden =
    secondaryStyle.display === 'none' ||
    secondaryStyle.visibility === 'hidden' ||
    containerStyle.display === 'none' ||
    containerStyle.visibility === 'hidden' ||
    hostStyle.display === 'none' ||
    hostStyle.visibility === 'hidden'
  if (isHidden) return false

  const pointerBlocked =
    secondaryStyle.pointerEvents === 'none' || containerStyle.pointerEvents === 'none' || hostStyle.pointerEvents === 'none'
  if (pointerBlocked) return false

  const secondaryBox = secondary.getBoundingClientRect()
  const chatBox = chatFrameHost.getBoundingClientRect()
  const frameBox = chatFrame.getBoundingClientRect()
  return secondaryBox.width > 80 && chatBox.width > 80 && chatBox.height > 120 && frameBox.height > 120
}

const closeNativeChat = async (page: import('@playwright/test').Page) => {
  const outerSelectors = [
    'ytd-live-chat-frame #show-hide-button button',
    'ytd-live-chat-frame #show-hide-button yt-icon-button',
    'ytd-live-chat-frame #close-button button',
    'ytd-live-chat-frame #close-button yt-icon-button',
    'ytd-live-chat-frame button[aria-label="Close"]',
    'ytd-live-chat-frame button[title="Close"]',
  ]

  for (const selector of outerSelectors) {
    const button = page.locator(selector).first()
    if (await button.isVisible({ timeout: 1500 }).catch(() => false)) {
      await button.click()
      return
    }
  }

  const frameLocator = page.frameLocator('#chatframe')
  const innerSelectors = [
    'yt-live-chat-header-renderer #close-button button',
    'yt-live-chat-header-renderer #close-button yt-icon-button',
    'yt-live-chat-header-renderer button[aria-label="Close"]',
    'yt-live-chat-header-renderer button[title="Close"]',
  ]
  for (const selector of innerSelectors) {
    const button = frameLocator.locator(selector).first()
    if (await button.isVisible({ timeout: 1500 }).catch(() => false)) {
      await button.click()
      return
    }
  }

  await page.evaluate(() => {
    document.querySelector('#chat-container')?.setAttribute('hidden', 'true')
    document.querySelector('ytd-live-chat-frame')?.remove()
  })
}

const collectFullscreenChatOffset = () => {
  const host = document.getElementById('shadow-root-live-chat') as HTMLElement | null
  const player = document.getElementById('movie_player') as HTMLElement | null
  const fullscreenElement = document.fullscreenElement as HTMLElement | null
  const root = host?.shadowRoot ?? null

  const overlay = root?.querySelector('div.fixed') as HTMLElement | null
  const resizableCandidates = root ? Array.from(root.querySelectorAll<HTMLElement>('div.absolute')) : []
  const resizable =
    resizableCandidates.find(element => element.style.top !== '' && element.style.left !== '') ?? resizableCandidates[0] ?? null

  const rectToJson = (element: HTMLElement | null) => {
    if (!element) return null
    const rect = element.getBoundingClientRect()
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
    }
  }

  const styleToJson = (element: HTMLElement | null) => {
    if (!element) return null
    const style = window.getComputedStyle(element)
    return {
      position: style.position,
      top: style.top,
      left: style.left,
      transform: style.transform,
      willChange: style.willChange,
      contain: style.contain,
    }
  }

  const overlayRect = rectToJson(overlay)
  const resizableRect = rectToJson(resizable)
  const resizableStyleTop = resizable?.style.top ?? null
  const resizableStyleLeft = resizable?.style.left ?? null
  const expectedTop = overlayRect && resizableStyleTop ? overlayRect.top + Number.parseFloat(resizableStyleTop) : null
  const expectedLeft = overlayRect && resizableStyleLeft ? overlayRect.left + Number.parseFloat(resizableStyleLeft) : null
  const deltaTop = resizableRect && expectedTop !== null ? resizableRect.top - expectedTop : null
  const deltaLeft = resizableRect && expectedLeft !== null ? resizableRect.left - expectedLeft : null

  return {
    fullscreenElement: fullscreenElement?.id ?? fullscreenElement?.tagName ?? null,
    hostRect: rectToJson(host),
    playerRect: rectToJson(player),
    overlayRect,
    resizableRect,
    resizableStyleTop,
    resizableStyleLeft,
    expectedTop,
    expectedLeft,
    deltaTop,
    deltaLeft,
    styles: {
      html: styleToJson(document.documentElement),
      body: styleToJson(document.body),
      player: styleToJson(player),
      host: styleToJson(host),
    },
  }
}

test.describe('fullscreen chat offset', { tag: '@live' }, () => {
  test('fullscreen chat overlay aligns to viewport', async ({ page, liveUrl }) => {
    test.setTimeout(180000)

    if (!liveUrl) {
      test.skip(true, 'No live URL with chat found.')
      return
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)

    await yt.goto(liveUrl)

    await page.waitForSelector('ytd-live-chat-frame', { state: 'attached' })
    await expect.poll(async () => page.evaluate(isNativeChatUsable)).toBe(true)
    await closeNativeChat(page)
    await expect.poll(async () => page.evaluate(isNativeChatUsable)).toBe(false)

    await yt.enterFullscreen()

    const switchReady = await overlay.waitForSwitchReady()
    if (!switchReady) {
      test.skip(true, 'Fullscreen chat switch button did not appear.')
      return
    }

    const switchButton = overlay.switchButton()
    const switchEnabled = await page
      .waitForFunction(
        selector => {
          const button = document.querySelector(selector) as HTMLButtonElement | null
          if (!button) return false
          return !button.disabled && button.getAttribute('aria-disabled') !== 'true'
        },
        await switchButton.evaluate(el => {
          const container = el.closest('[id]')
          return container ? `#${container.id} button.ytp-button` : 'button.ytp-button'
        }),
        { timeout: 10000 },
      )
      .then(
        () => true,
        () => false,
      )
    if (!switchEnabled) {
      test.skip(true, 'Fullscreen chat switch is disabled because live source is unavailable.')
      return
    }

    await overlay.toggleOn()

    const overlayReady = await overlay.waitForChatLoaded()
    if (!overlayReady) {
      test.skip(true, 'Extension iframe did not load in time.')
      return
    }

    const metrics = await page.evaluate(collectFullscreenChatOffset)
    const outputPath = test.info().outputPath('fullscreen-chat-offset.json')
    await writeFile(outputPath, JSON.stringify({ liveUrl, capturedAt: new Date().toISOString(), metrics }, null, 2), 'utf-8')

    expect(metrics.overlayRect?.top ?? 0).toBeLessThan(1)
    expect(Math.abs(metrics.deltaTop ?? 0)).toBeLessThan(1)
    expect(metrics.resizableStyleTop).not.toBeNull()
    const parsedTop = Number.parseFloat(metrics.resizableStyleTop ?? 'NaN')
    expect(Number.isFinite(parsedTop)).toBe(true)
    expect(parsedTop).toBeGreaterThanOrEqual(0)
  })
})
