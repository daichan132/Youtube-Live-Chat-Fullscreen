import { expect, test } from '../../fixtures'
import {
  captureChatState,
  isExtensionArchiveChatPlayable,
  openArchiveWatchPage,
  shouldSkipArchiveFlowFailure,
} from '../../support/diagnostics'
import { selectArchiveReplayUrl } from '../../support/urls/archiveReplay'
import { reliableClick } from '../../utils/actions'
import { switchButtonSelector } from '../../utils/selectors'

type OverlayClipSnapshot = {
  exists: boolean
  enabled: boolean
  clipTop: number
  clipBottom: number
  height: number
  width: number
}

type HoverProbeState = {
  enterCount: number
  leaveCount: number
}

const getOverlayClipSnapshot = (): OverlayClipSnapshot => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const app = root?.querySelector('div[role="application"]') as HTMLElement | null
  const resizable = app?.querySelector(':scope > div.absolute') as HTMLElement | null
  const inner = resizable?.querySelector(':scope > div.relative.h-full.w-full.pointer-events-auto') as HTMLElement | null
  if (!resizable || !inner) {
    return {
      exists: false,
      enabled: false,
      clipTop: 0,
      clipBottom: 0,
      height: 0,
      width: 0,
    }
  }

  const box = resizable.getBoundingClientRect()
  const clipPath = window.getComputedStyle(inner).clipPath ?? ''
  const insetMatch = clipPath.match(/inset\(([-\d.]+)px\s+[-\d.]+px\s+([-\d.]+)px/i)
  const clipTop = insetMatch?.[1] ? Number.parseFloat(insetMatch[1]) : 0
  const clipBottom = insetMatch?.[2] ? Number.parseFloat(insetMatch[2]) : 0

  return {
    exists: true,
    enabled: clipTop > 0 || clipBottom > 0,
    clipTop,
    clipBottom,
    height: Math.round(box.height * 100) / 100,
    width: Math.round(box.width * 100) / 100,
  }
}

const isClipPathEnabled = () => {
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

const getOverlayCenter = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const app = root?.querySelector('div[role="application"]') as HTMLElement | null
  const resizable = app?.querySelector(':scope > div.absolute') as HTMLElement | null
  if (!resizable) return null

  const box = resizable.getBoundingClientRect()
  if (box.width <= 0 || box.height <= 0) return null

  return {
    x: Math.floor(box.left + box.width / 2),
    y: Math.floor(box.top + box.height / 2),
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

const movePointerAwayFromOverlay = async (page: import('@playwright/test').Page) => {
  const viewport = page.viewportSize()
  if (!viewport) return false

  // Default overlay starts near top-left (20, 20) with width/height 400.
  // Keep pointer in far top-right so hover is not triggered by our own actions.
  await page.mouse.move(viewport.width - 20, 20)
  return true
}

const setPersistedChatOnlyMode = async (page: import('@playwright/test').Page, extensionId: string) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`)

  const configured = await page.evaluate(async () => {
    const parsePersisted = (raw: unknown, fallbackVersion: number) => {
      if (typeof raw !== 'string' || raw.length === 0) {
        return { state: {}, version: fallbackVersion }
      }
      try {
        const parsed = JSON.parse(raw) as { state?: Record<string, unknown>; version?: number }
        return {
          state: parsed?.state && typeof parsed.state === 'object' ? parsed.state : {},
          version: typeof parsed?.version === 'number' ? parsed.version : fallbackVersion,
        }
      } catch {
        return { state: {}, version: fallbackVersion }
      }
    }

    const { ytdLiveChatStore, globalSettingStore } = await chrome.storage.local.get(['ytdLiveChatStore', 'globalSettingStore'])

    const currentYlc = parsePersisted(ytdLiveChatStore, 1)
    const currentGlobal = parsePersisted(globalSettingStore, 0)

    const nextYlc = {
      state: {
        ...currentYlc.state,
        alwaysOnDisplay: true,
        chatOnlyDisplay: true,
      },
      version: currentYlc.version,
    }

    const nextGlobal = {
      state: {
        ...currentGlobal.state,
        ytdLiveChat: true,
      },
      version: currentGlobal.version,
    }

    await chrome.storage.local.set({
      ytdLiveChatStore: JSON.stringify(nextYlc),
      globalSettingStore: JSON.stringify(nextGlobal),
    })

    return true
  })

  return configured
}

const openArchiveOverlayWithExtensionChat = async (page: import('@playwright/test').Page) => {
  const selectedArchiveUrl = await selectArchiveReplayUrl(page, { maxDurationMs: 45000 })
  if (!selectedArchiveUrl) {
    await captureChatState(page, test.info(), 'chat-only-auto-clip-url-selection-failed')
    test.skip(true, 'No archive replay URL satisfied preconditions.')
    return false
  }

  const archiveReady = await openArchiveWatchPage(page, selectedArchiveUrl, { maxDurationMs: 30000 })
  if (!archiveReady) {
    await captureChatState(page, test.info(), 'chat-only-auto-clip-precondition-missing')
    test.skip(true, 'Selected archive URL did not expose archive chat container in time.')
    return false
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
    await captureChatState(page, test.info(), 'chat-only-auto-clip-switch-missing')
    test.skip(true, 'Fullscreen chat switch button did not appear.')
    return false
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
    const state = await captureChatState(page, test.info(), 'chat-only-auto-clip-extension-unready')
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

test('chat-only clip enables after load without any overlay hover', async ({ page, extensionId }) => {
  test.setTimeout(180000)

  const configured = await setPersistedChatOnlyMode(page, extensionId)
  expect(configured).toBe(true)

  const ready = await openArchiveOverlayWithExtensionChat(page)
  if (!ready) return

  const movedAway = await movePointerAwayFromOverlay(page)
  if (!movedAway) {
    test.skip(true, 'Viewport was unavailable.')
    return
  }

  const probeInstalled = await page.evaluate(installOverlayHoverProbe)
  expect(probeInstalled).toBe(true)

  await expect.poll(async () => page.evaluate(isClipPathEnabled), { timeout: 15000 }).toBe(true)

  const snapshot = await page.evaluate(getOverlayClipSnapshot)
  const hoverProbe = await page.evaluate(readOverlayHoverProbe)

  await test.info().attach('chat-only-auto-clip-no-hover', {
    body: JSON.stringify({ snapshot, hoverProbe }, null, 2),
    contentType: 'application/json',
  })

  expect(snapshot.exists).toBe(true)
  expect(snapshot.enabled).toBe(true)
  expect(hoverProbe?.enterCount ?? -1).toBe(0)
})

test('chat-only clip re-enables automatically after first hover without pointer leave', async ({ page, extensionId }) => {
  test.setTimeout(180000)

  const configured = await setPersistedChatOnlyMode(page, extensionId)
  expect(configured).toBe(true)

  const ready = await openArchiveOverlayWithExtensionChat(page)
  if (!ready) return

  const probeInstalled = await page.evaluate(installOverlayHoverProbe)
  expect(probeInstalled).toBe(true)

  const center = await page.evaluate(getOverlayCenter)
  if (!center) {
    test.skip(true, 'Overlay center could not be resolved.')
    return
  }

  await page.mouse.move(center.x, center.y)

  // No pointer leave after first hover.
  await expect.poll(async () => page.evaluate(isClipPathEnabled), { timeout: 15000 }).toBe(true)

  const snapshot = await page.evaluate(getOverlayClipSnapshot)
  const hoverProbe = await page.evaluate(readOverlayHoverProbe)

  await test.info().attach('chat-only-auto-clip-hovered-once', {
    body: JSON.stringify({ snapshot, hoverProbe, center }, null, 2),
    contentType: 'application/json',
  })

  expect(snapshot.exists).toBe(true)
  expect(snapshot.enabled).toBe(true)
  expect((hoverProbe?.enterCount ?? 0) > 0).toBe(true)
})
