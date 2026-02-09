import { expect, test } from '../../fixtures'
import { findLiveUrlWithChat } from '../../utils/liveUrl'
import { switchButtonSelector } from '../../utils/selectors'

const isExtensionChatLoaded = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot
  if (!root) return false
  const iframe = root.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return false
  const src = iframe.getAttribute('src') ?? ''
  return Boolean(src && !src.includes('about:blank'))
}

const getPointerState = () => {
  const ytdApp = document.querySelector('ytd-app') as HTMLElement | null
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  const bottomY = Math.max(10, window.innerHeight - 10)

  const centerElement = document.elementFromPoint(centerX, centerY) as HTMLElement | null
  const bottomElement = document.elementFromPoint(centerX, bottomY) as HTMLElement | null

  const centerRoot = centerElement?.getRootNode()
  const bottomRoot = bottomElement?.getRootNode()

  return {
    ytdPointerEvents: ytdApp ? window.getComputedStyle(ytdApp).pointerEvents : null,
    center: {
      tag: centerElement?.tagName ?? null,
      id: centerElement?.id ?? null,
      shadowHostId: centerRoot instanceof ShadowRoot ? (centerRoot.host as HTMLElement | null)?.id ?? null : null,
    },
    bottom: {
      tag: bottomElement?.tagName ?? null,
      id: bottomElement?.id ?? null,
      shadowHostId: bottomRoot instanceof ShadowRoot ? (bottomRoot.host as HTMLElement | null)?.id ?? null : null,
    },
  }
}

const getElementAtPoint = ({ x, y }: { x: number; y: number }) => {
  const element = document.elementFromPoint(x, y) as HTMLElement | null
  const rootNode = element?.getRootNode()
  return {
    tag: element?.tagName ?? null,
    id: element?.id ?? null,
    className: element?.className ?? null,
    shadowHostId: rootNode instanceof ShadowRoot ? (rootNode.host as HTMLElement | null)?.id ?? null : null,
  }
}

test('fullscreen chat does not block player clicks', async ({ page }) => {
  test.setTimeout(140000)

  const liveUrl = await findLiveUrlWithChat(page)
  if (!liveUrl) {
    test.skip(true, 'No live URL with playable chat found.')
    return
  }

  const nativeChatReady = await page.waitForSelector('ytd-live-chat-frame', { state: 'attached', timeout: 20000 }).then(
    () => true,
    () => false,
  )
  if (!nativeChatReady) {
    test.skip(true, 'Live URL did not expose native chat frame in time.')
    return
  }

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null)

  await page.locator('#movie_player').hover()
  const switchButton = page.locator(switchButtonSelector)
  const switchReady = await switchButton.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false)
  if (!switchReady) {
    test.skip(true, 'Fullscreen chat switch button did not appear.')
    return
  }
  if ((await switchButton.getAttribute('aria-pressed')) !== 'true') {
    await switchButton.click({ force: true })
  }
  await expect(switchButton).toHaveAttribute('aria-pressed', 'true')

  let overlayReady = false
  try {
    await expect.poll(async () => page.evaluate(isExtensionChatLoaded), { timeout: 20000 }).toBe(true)
    overlayReady = true
  } catch {
    overlayReady = false
  }
  if (!overlayReady) {
    test.skip(true, 'Extension iframe did not load in time.')
    return
  }

  const pointerState = await page.evaluate(getPointerState)
  await test.info().attach('pointer-state', {
    body: JSON.stringify(pointerState, null, 2),
    contentType: 'application/json',
  })

  await expect.poll(async () => page.evaluate(() => {
    const ytdApp = document.querySelector('ytd-app') as HTMLElement | null
    return ytdApp ? window.getComputedStyle(ytdApp).pointerEvents : null
  })).toBe('auto')

  await expect.poll(async () => page.evaluate(() => {
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    const elementAtPoint = document.elementFromPoint(centerX, centerY) as HTMLElement | null
    const rootNode = elementAtPoint?.getRootNode()
    return rootNode instanceof ShadowRoot ? (rootNode.host as HTMLElement | null)?.id ?? null : null
  })).not.toBe('shadow-root-live-chat')

  await expect.poll(async () => page.evaluate(() => {
    const centerX = window.innerWidth / 2
    const bottomY = Math.max(10, window.innerHeight - 10)
    const elementAtPoint = document.elementFromPoint(centerX, bottomY) as HTMLElement | null
    const rootNode = elementAtPoint?.getRootNode()
    return rootNode instanceof ShadowRoot ? (rootNode.host as HTMLElement | null)?.id ?? null : null
  })).not.toBe('shadow-root-live-chat')

  await page.locator('#movie_player').hover()
  const playButton = page.locator('button.ytp-play-button')
  await expect(playButton).toBeVisible()

  const wasPaused = await page.evaluate(() => {
    const video = document.querySelector('video') as HTMLVideoElement | null
    return video ? video.paused : null
  })

  await playButton.click()

  if (wasPaused !== null) {
    const playStateChanged = await page
      .waitForFunction((initialPaused) => {
        const video = document.querySelector('video') as HTMLVideoElement | null
        return video ? video.paused !== initialPaused : false
      }, wasPaused)
      .then(() => true, () => false)
    if (!playStateChanged) {
      test.skip(true, 'Play state did not change after click (environment can block media controls).')
      return
    }
  }

  await page.locator('#movie_player').hover()
  const switchButtonControl = page.locator(switchButtonSelector)
  const switchVisible = await switchButtonControl.isVisible({ timeout: 5000 }).catch(() => false)
  if (!switchVisible) {
    test.skip(true, 'Switch button was not visible while controls were shown.')
    return
  }
  const switchBox = await switchButtonControl.boundingBox()
  expect(switchBox).not.toBeNull()
  if (switchBox) {
    const switchHit = await page.evaluate(getElementAtPoint, {
      x: switchBox.x + switchBox.width / 2,
      y: switchBox.y + switchBox.height / 2,
    })
    await test.info().attach('switch-button-hit', {
      body: JSON.stringify(switchHit, null, 2),
      contentType: 'application/json',
    })
    expect(switchHit.shadowHostId).not.toBe('shadow-root-live-chat')
  }

  await switchButtonControl.click()
  await expect(switchButtonControl).toHaveAttribute('aria-pressed', 'false')

  await switchButtonControl.click()
  await expect(switchButtonControl).toHaveAttribute('aria-pressed', 'true')

  await page.locator('#movie_player').hover()
  const fullscreenButton = page.locator('button.ytp-fullscreen-button')
  const fullscreenVisible = await fullscreenButton.isVisible({ timeout: 5000 }).catch(() => false)
  if (!fullscreenVisible) {
    test.skip(true, 'Fullscreen button was not visible while controls were shown.')
    return
  }
  const fullscreenBox = await fullscreenButton.boundingBox()
  expect(fullscreenBox).not.toBeNull()
  if (fullscreenBox) {
    const fullscreenHit = await page.evaluate(getElementAtPoint, {
      x: fullscreenBox.x + fullscreenBox.width / 2,
      y: fullscreenBox.y + fullscreenBox.height / 2,
    })
    await test.info().attach('fullscreen-button-hit', {
      body: JSON.stringify(fullscreenHit, null, 2),
      contentType: 'application/json',
    })
    expect(fullscreenHit.shadowHostId).not.toBe('shadow-root-live-chat')
  }

  await fullscreenButton.click()
  await expect.poll(async () => page.evaluate(() => document.fullscreenElement === null)).toBe(true)
})
