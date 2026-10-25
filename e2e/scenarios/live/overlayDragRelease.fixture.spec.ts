import { type Extension, expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { Page } from '@playwright/test'
import { GEOMETRY_STORAGE_KEY } from '../../../shared/settings/storageKeys'

type Layout = { x: number; y: number; width: number; height: number }
type Point = { x: number; y: number }
const state = {
  video: { id: 'ylc-drag-release', title: 'Local drag release fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: { mode: 'live', purchaseInteractions: true, native: { state: 'absent' }, response: 'playable' },
} satisfies YouTubeScenarioState

const readSaved = async (extension: Extension) => (await extension.storage.get(GEOMETRY_STORAGE_KEY))[GEOMETRY_STORAGE_KEY]

const expectLayout = async (overlay: ExtensionOverlay, expected: Layout) => {
  await expect(async () => {
    const actual = await overlay.getGeometry()
    for (const key of ['x', 'y', 'width', 'height'] as const) expect(actual[key]).toBeCloseTo(expected[key], 3)
  }).toPass({ timeout: 3000 })
}

const observeEvents = (page: Page) =>
  page.evaluate(() => {
    const events: unknown[] = []
    const host = document.querySelector('#shadow-root-live-chat')
    const root = host?.shadowRoot
    const panel = root?.querySelector('[data-ylc-resizable]')
    if (!root || !panel) throw new Error('The current overlay must exist before recording input.')
    const readLayout = () => {
      const bounds = panel.getBoundingClientRect()
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
    }
    const record = (event: Event) => {
      const pointer = event as PointerEvent
      events.push({
        type: event.type,
        trusted: event.isTrusted,
        time: performance.now(),
        pointerId: pointer.pointerId,
        x: pointer.clientX,
        y: pointer.clientY,
        buttons: pointer.buttons,
        focus: document.hasFocus(),
        target: (event.target as Element | null)?.localName ?? null,
        path: event
          .composedPath()
          .filter((node): node is Element => node instanceof Element)
          .map(node => ({
            tag: node.localName,
            drag: node.hasAttribute('data-ylc-drag-handle'),
            resize: node.getAttribute('data-ylc-resize-direction'),
            player: node.id === 'movie_player',
          })),
        layout: readLayout(),
      })
    }
    for (const type of [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'gotpointercapture',
      'lostpointercapture',
      'blur',
      'focus',
    ]) {
      window.addEventListener(type, record, true)
    }
    const nativeClicks = { count: 0 }
    const chat = root.querySelector<HTMLIFrameElement>('iframe[data-ylc-chat]')
    if (!chat?.contentDocument) throw new Error('The real attached chat document must be accessible.')
    chat.contentDocument.addEventListener('click', () => nativeClicks.count++, true)
    ;(window as Window & { __ylcDragReleaseNativeClicks?: { count: number } }).__ylcDragReleaseNativeClicks = nativeClicks
    ;(window as Window & { __ylcDragReleaseEvents?: unknown[] }).__ylcDragReleaseEvents = events
  })

const cases: Array<{
  name: string
  layout: Layout
  viewport?: { width: number; height: number }
  delta?: Point
  endpoint?: Point
  via?: Point
  focusComposer?: boolean
  stopHostPointerUp?: boolean
  releaseOverChat?: boolean
  loseCaptureDuringDrag?: boolean
}> = [
  {
    name: 'capture being released while the primary button is still held',
    layout: { x: 100, y: 80, width: 400, height: 300 },
    delta: { x: 120, y: -40 },
    loseCaptureDuringDrag: true,
  },
  {
    name: 'capture being released before dropping over the chat iframe',
    layout: { x: 100, y: 80, width: 400, height: 300 },
    delta: { x: -40, y: -100 },
    releaseOverChat: true,
    loseCaptureDuringDrag: true,
  },
  { name: 'an ordinary interior release', layout: { x: 100, y: 80, width: 400, height: 300 }, delta: { x: 120, y: -40 } },
  {
    name: 'a release over the initial and clamped chat iframe area',
    layout: { x: 100, y: 80, width: 400, height: 300 },
    delta: { x: -40, y: -100 },
    releaseOverChat: true,
  },
  { name: 'the upper-left viewport clamp', layout: { x: 100, y: 80, width: 400, height: 300 }, endpoint: { x: 1, y: 1 } },
  {
    name: 'the lower-right clamp with maximum chat dimensions',
    layout: { x: 100, y: 50, width: 832, height: 648 },
    endpoint: { x: 1278, y: 718 },
  },
  {
    name: 'returning from a clamped point before release',
    layout: { x: 100, y: 80, width: 400, height: 300 },
    via: { x: 1, y: 1 },
    delta: { x: 35, y: -25 },
  },
  {
    name: 'a composer retaining focus before drag starts',
    layout: { x: 100, y: 80, width: 400, height: 300 },
    delta: { x: 80, y: -40 },
    focusComposer: true,
  },
  {
    name: 'a 320x240 player with the control rail overlapping the chat',
    layout: { x: 10, y: 10, width: 240, height: 180 },
    viewport: { width: 320, height: 240 },
    endpoint: { x: 318, y: 238 },
  },
  {
    name: 'a host player stopping pointerup propagation',
    layout: { x: 100, y: 80, width: 400, height: 300 },
    delta: { x: 120, y: -40 },
    stopHostPointerUp: true,
  },
]

for (const probe of cases) {
  test(`preserves drag preview on release after ${probe.name}`, { tag: '@fixture' }, async ({ page, extension }, testInfo) => {
    const viewport = probe.viewport ?? { width: 1280, height: 720 }
    await page.setViewportSize(viewport)
    await patchOverlayStore(extension, {
      geometry: {
        reference: 'player',
        rect: {
          x: probe.layout.x / viewport.width,
          y: probe.layout.y / viewport.height,
          width: probe.layout.width / viewport.width,
          height: probe.layout.height / viewport.height,
        },
        pinned: true,
      },
      profile: { display: { idleVisibility: 'always-visible', contentMode: 'full-chat' } },
    })
    const scenario = new YouTubeScenario(page)
    await scenario.load(state)
    await scenario.enterFullscreen()
    const overlay = new ExtensionOverlay(page)
    await overlay.expectChatLoaded({ timeout: 12000 })
    await overlay.revealControls()
    if (probe.focusComposer) {
      const composer = page.frameLocator('iframe[data-ylc-chat]').locator('[contenteditable][aria-label="Chat draft"]')
      await composer.click()
      await expect(composer).toBeFocused()
    }
    if (probe.stopHostPointerUp) {
      await page.evaluate(() => {
        document.getElementById('movie_player')?.addEventListener('pointerup', event => event.stopPropagation())
      })
    }
    const initial = await overlay.getGeometry()
    const savedBefore = await readSaved(extension)
    const handle = page.getByRole('button', { name: 'Drag to move', exact: true })
    const bounds = await handle.boundingBox()
    if (!bounds) throw new Error('The real drag button must have browser bounds.')
    // CDP rounds fractional pointer coordinates; integer input keeps this
    // independent geometry oracle exact across focused/animated rail states.
    const start = { x: Math.round(bounds.x + bounds.width / 2), y: Math.round(bounds.y + bounds.height / 2) }
    const delta = probe.delta ?? { x: 0, y: 0 }
    const endpoint = probe.endpoint ?? { x: start.x + delta.x, y: start.y + delta.y }
    const expected = {
      x: Math.min(Math.max(initial.x + endpoint.x - start.x, 10), viewport.width - initial.width - 10),
      y: Math.min(Math.max(initial.y + endpoint.y - start.y, 10), viewport.height - initial.height - 10),
      width: initial.width,
      height: initial.height,
    }
    await observeEvents(page)
    let pointerDown = false
    let preview: Awaited<ReturnType<ExtensionOverlay['getGeometry']>> | undefined
    let released: Awaited<ReturnType<ExtensionOverlay['getGeometry']>> | undefined
    let nativeReleaseTarget: unknown
    try {
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      pointerDown = true
      if (probe.via) await page.mouse.move(probe.via.x, probe.via.y, { steps: 4 })
      await page.mouse.move(endpoint.x, endpoint.y, { steps: 6 })
      await expectLayout(overlay, expected)
      if (probe.loseCaptureDuringDrag) {
        // Host/player updates can release capture without cancelling the user's
        // gesture. This is a real browser capture loss, not a synthetic event.
        await handle.evaluate(element => element.releasePointerCapture(1))
        await page.mouse.move(endpoint.x, endpoint.y)
        await expectLayout(overlay, expected)
        // Prove the session still processes new input instead of merely
        // freezing the preview until the button is released.
        if (!probe.releaseOverChat) {
          await page.mouse.move(endpoint.x - 20, endpoint.y + 20, { steps: 2 })
          await expectLayout(overlay, { ...expected, x: expected.x - 20, y: expected.y + 20 })
          await page.mouse.move(endpoint.x, endpoint.y, { steps: 2 })
          await expectLayout(overlay, expected)
        }
      }
      preview = await overlay.getGeometry()
      nativeReleaseTarget = await page.locator('iframe[data-ylc-chat]').evaluate((iframe, point) => {
        const frame = iframe as HTMLIFrameElement
        const bounds = frame.getBoundingClientRect()
        const inside = point.x >= bounds.left && point.x < bounds.right && point.y >= bounds.top && point.y < bounds.bottom
        const element = inside ? frame.contentDocument?.elementFromPoint(point.x - bounds.left, point.y - bounds.top) : null
        return { inside, tag: element?.localName ?? null, supportButton: Boolean(element?.closest('[aria-label="Open support menu"]')) }
      }, endpoint)
      if (probe.releaseOverChat) expect(nativeReleaseTarget).toMatchObject({ inside: true })
      await testInfo.attach('held-preview', { body: await page.screenshot(), contentType: 'image/png' })
      await page.mouse.up()
      pointerDown = false
      released = await overlay.getGeometry()
      await expectLayout(overlay, expected)
      await expect(page.locator('[data-ylc-drag-shield]')).toHaveCount(0)
      await page.waitForTimeout(700)
      await expectLayout(overlay, expected)
      await expect(async () => {
        const saved = (await readSaved(extension)) as { value: { reference: string; pinned: boolean; rect: Layout } }
        expect(saved.value).toMatchObject({ reference: 'player', pinned: true })
        for (const key of ['x', 'y', 'width', 'height'] as const) {
          const reference = key === 'x' || key === 'width' ? viewport.width : viewport.height
          // At tiny viewports the 240px rendered minimum can exceed the saved
          // 65% width cap; those two existing contracts are intentionally distinct.
          const ratio = expected[key] / reference
          const savedRatio = key === 'width' ? Math.min(ratio, 0.65) : key === 'height' ? Math.min(ratio, 0.9) : ratio
          expect(saved.value.rect[key]).toBeCloseTo(savedRatio, 8)
        }
      }).toPass({ timeout: 5000 })
    } finally {
      if (pointerDown) await page.mouse.up()
      const nativeClicks = await page.evaluate(
        () => (window as Window & { __ylcDragReleaseNativeClicks?: { count: number } }).__ylcDragReleaseNativeClicks?.count,
      )
      const purchase = await page
        .frameLocator('iframe[data-ylc-chat]')
        .locator('body')
        .evaluate(body => ({
          ...(body.ownerDocument.defaultView as Window & { __ylcFixturePurchase?: Record<string, number> }).__ylcFixturePurchase,
        }))
      await testInfo.attach('released-preview', { body: await page.screenshot(), contentType: 'image/png' })
      await testInfo.attach('drag-release-evidence', {
        body: Buffer.from(
          JSON.stringify(
            {
              name: probe.name,
              start,
              endpoint,
              initial,
              expected,
              preview,
              released,
              nativeReleaseTarget,
              nativeClicks,
              purchase,
              final: await overlay.getGeometry(),
              savedBefore,
              savedAfter: await readSaved(extension),
              events: await page.evaluate(() => (window as Window & { __ylcDragReleaseEvents?: unknown[] }).__ylcDragReleaseEvents),
            },
            null,
            2,
          ),
        ),
        contentType: 'application/json',
      })
      expect(nativeClicks).toBe(0)
      expect(purchase).toEqual({
        supportEntries: 0,
        superChatEntries: 0,
        membershipEntries: 0,
        preventedEntries: 0,
        trustedEntries: 0,
        windowOpenCalls: 0,
        confirmations: 0,
      })
    }
  })
}
