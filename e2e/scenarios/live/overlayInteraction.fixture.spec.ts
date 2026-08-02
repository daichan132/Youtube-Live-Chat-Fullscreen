import { E2E_BRIDGE_FILE } from '@e2e/config/buildOutput'
import { type Extension, expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { Page } from '@playwright/test'
import { layoutGeometryToV2, type PixelChatGeometry } from '../../../shared/settings/chatGeometry'
import type { ChatGeometry, ChatGeometryV2 } from '../../../shared/settings/model'
import { CHAT_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const scenarioState = {
  video: { id: 'ylc-overlay-boundary', title: 'Overlay interaction fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'live',
    native: { state: 'absent' },
    response: 'playable',
  },
} satisfies YouTubeScenarioState

const FIXTURE_REFERENCE = { width: 1280, height: 720 }
const SEEDED_LAYOUT: PixelChatGeometry = {
  coordinates: { x: 100, y: 80 },
  size: { width: 400, height: 300 },
}
const SEEDED_GEOMETRY = layoutGeometryToV2(SEEDED_LAYOUT, FIXTURE_REFERENCE, true)

const readPersistedGeometry = (storagePage: Page): Promise<ChatGeometry | null> =>
  storagePage.evaluate(async key => {
    const stored = (await chrome.storage.local.get(key))[key] as { value?: { geometry?: ChatGeometry } } | undefined
    return stored?.value?.geometry ?? null
  }, CHAT_STORAGE_KEY)

const expectPersistedGeometry = async (storagePage: Page, geometry: ChatGeometry) => {
  await expect.poll(() => readPersistedGeometry(storagePage)).toEqual(geometry)
}

const openStoragePage = async (extension: Extension, page: Page) => {
  const storagePage = await page.context().newPage()
  await storagePage.goto(extension.url(E2E_BRIDGE_FILE), { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.bringToFront()
  return storagePage
}

test.describe('overlay browser interaction boundary', { tag: '@live' }, () => {
  test('wires drag, eight resize handles, clamp, passthrough, keyboard, and operation-end persistence', { tag: '@fixture' }, async ({
    page,
    extension,
  }) => {
    test.setTimeout(120000)

    expect(await patchOverlayStore(extension, { geometry: SEEDED_GEOMETRY })).not.toBeNull()
    const storagePage = await openStoragePage(extension, page)
    try {
      const scenario = new YouTubeScenario(page)
      const overlay = new ExtensionOverlay(page)
      await scenario.load(scenarioState)
      await scenario.enterFullscreen()
      await overlay.expectSwitchReady({ timeout: 12000 })
      await overlay.expectChatLoaded({ timeout: 12000 })
      await expect
        .poll(() => overlay.getGeometry())
        .toMatchObject({
          x: SEEDED_LAYOUT.coordinates.x,
          y: SEEDED_LAYOUT.coordinates.y,
          width: SEEDED_LAYOUT.size.width,
          height: SEEDED_LAYOUT.size.height,
        })
      const viewport = await overlay.getGeometry()

      expect((await overlay.getResizeDirections()).sort()).toEqual(
        ['top', 'right', 'bottom', 'left', 'topRight', 'bottomRight', 'bottomLeft', 'topLeft'].sort(),
      )

      await overlay.clickPlayerBoundaryProbe()
      await expect.poll(() => overlay.boundaryProbeClicks()).toBe(1)

      await overlay.startDrag({ x: 2000, y: 2000 })
      const clampedCoordinates = {
        x: viewport.viewportWidth - SEEDED_LAYOUT.size.width - 10,
        y: viewport.viewportHeight - SEEDED_LAYOUT.size.height - 10,
      }
      await expect
        .poll(() => overlay.getGeometry())
        .toMatchObject({
          ...clampedCoordinates,
          width: SEEDED_LAYOUT.size.width,
          height: SEEDED_LAYOUT.size.height,
        })
      expect(await readPersistedGeometry(storagePage)).toEqual(SEEDED_GEOMETRY)

      await overlay.finishPointerGesture()
      const draggedGeometry: ChatGeometryV2 = layoutGeometryToV2(
        { coordinates: clampedCoordinates, size: SEEDED_LAYOUT.size },
        { width: viewport.viewportWidth, height: viewport.viewportHeight },
        true,
      )
      await expectPersistedGeometry(storagePage, draggedGeometry)

      await overlay.startResize('bottomRight', { x: -80, y: -60 })
      await expect
        .poll(() => overlay.getGeometry())
        .toMatchObject({
          ...clampedCoordinates,
          width: 320,
          height: 240,
        })
      expect(await readPersistedGeometry(storagePage)).toEqual(draggedGeometry)

      await overlay.finishPointerGesture()
      const resizedGeometry: ChatGeometryV2 = layoutGeometryToV2(
        { coordinates: clampedCoordinates, size: { width: 320, height: 240 } },
        { width: viewport.viewportWidth, height: viewport.viewportHeight },
        true,
      )
      await expectPersistedGeometry(storagePage, resizedGeometry)

      await overlay.moveWithKeyboard('ArrowLeft')
      await expectPersistedGeometry(
        storagePage,
        layoutGeometryToV2(
          { coordinates: { x: clampedCoordinates.x - 10, y: clampedCoordinates.y }, size: { width: 320, height: 240 } },
          { width: viewport.viewportWidth, height: viewport.viewportHeight },
          true,
        ),
      )
    } finally {
      await storagePage.close()
    }
  })

  test('collapses messages-only chrome at idle and preserves interactive geometry while expanded', { tag: '@fixture' }, async ({
    page,
    extension,
  }) => {
    test.setTimeout(90000)

    expect(
      await patchOverlayStore(extension, {
        profile: {
          display: {
            idleVisibility: 'always-visible',
            contentMode: 'messages-only',
          },
        },
      }),
    ).not.toBeNull()

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(scenarioState)
    await scenario.enterFullscreen()
    await overlay.expectSwitchReady({ timeout: 12000 })
    await overlay.expectChatLoaded({ timeout: 12000 })
    await overlay.installChatOnlyGeometryProbe()

    await expect
      .poll(() => overlay.getChatOnlyGeometryState())
      .toMatchObject({
        collapsed: true,
        header: { height: 0 },
        input: { height: 0 },
        iframe: { width: 400, height: 400 },
        viewport: { width: 400, height: 400 },
        carrier: { width: 400, height: 400 },
        iframeMatchesViewport: true,
        carrierMatchesViewport: true,
      })

    await overlay.frame().hover({ position: { x: 200, y: 160 } })
    await expect
      .poll(() => overlay.getChatOnlyGeometryState())
      .toMatchObject({
        collapsed: false,
        header: { height: 56 },
        input: { height: 64 },
        reaction: { width: 44, height: 44 },
        popover: { width: 180, height: 96 },
        iframeMatchesViewport: true,
        carrierMatchesViewport: true,
        reactionFullyVisible: true,
        popoverFullyVisible: true,
        reactionHitTestVisible: true,
        popoverHitTestVisible: true,
      })

    await page.mouse.move(1000, 600)
    await expect
      .poll(() => overlay.getChatOnlyGeometryState())
      .toMatchObject({
        collapsed: true,
        header: { height: 0 },
        input: { height: 0 },
        iframeMatchesViewport: true,
        carrierMatchesViewport: true,
      })
  })
})
