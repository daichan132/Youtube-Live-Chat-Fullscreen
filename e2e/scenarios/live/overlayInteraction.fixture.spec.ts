import { readFileSync } from 'node:fs'
import { E2E_BRIDGE_FILE } from '@e2e/config/buildOutput'
import { type Extension, expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { ChatCssLayoutFixture } from '@e2e/support/chatCssLayoutFixture'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { Page } from '@playwright/test'
import { layoutGeometryToV2, type PixelChatGeometry } from '../../../shared/settings/chatGeometry'
import type { ChatGeometry, ChatGeometryV2 } from '../../../shared/settings/model'
import {
  APPEARANCE_STORAGE_KEY,
  CUSTOM_CSS_STORAGE_KEY,
  CUSTOM_CSS_SUSPENDED_STORAGE_KEY,
  GEOMETRY_STORAGE_KEY,
  SAVED_CHAT_CSS_STORAGE_KEY,
} from '../../../shared/settings/storageKeys'

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
    const stored = (await chrome.storage.local.get(key))[key] as { value?: ChatGeometry } | undefined
    return stored?.value ?? null
  }, GEOMETRY_STORAGE_KEY)

const expectPersistedGeometry = async (storagePage: Page, geometry: ChatGeometry) => {
  await expect.poll(() => readPersistedGeometry(storagePage)).toEqual(geometry)
}

const openStoragePage = async (extension: Extension, page: Page) => {
  const storagePage = await page.context().newPage()
  await storagePage.goto(extension.url(E2E_BRIDGE_FILE), { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.bringToFront()
  return storagePage
}

const expectChatPresetLayout = async (fixture: ChatCssLayoutFixture, presetId: 'messenger' | 'stage' | 'timeline', css: string) => {
  await expect.poll(async () => {
    const layout = await fixture.read()
    return { scoped: layout.scoped, sources: layout.sources, directions: layout.messages.map(message => message.content.flexDirection) }
  }).toEqual({ scoped: true, sources: [css], directions: ['column', 'column'] })
  const layout = await fixture.read()
  expect(layout.messages).toHaveLength(2)
  const composer = layout.controls.find(control => control.name === 'composer')?.position
  if (!composer) throw new Error('The chat fixture composer has no geometry.')
  expect(composer.top).toBeGreaterThanOrEqual(0)
  expect(composer.left).toBeGreaterThanOrEqual(0)
  expect(composer.right).toBeLessThanOrEqual(layout.viewport.width)
  expect(composer.bottom).toBeLessThanOrEqual(layout.viewport.height)
  for (const message of layout.messages) {
    expect(message.renderer.display).toBe('flex')
    expect(message.content.display).toBe('flex')
    expect(message.message.display).toBe('block')
    expect(message.authorBox.height).toBeGreaterThan(0)
    expect(message.messageBox.height).toBeGreaterThan(0)
    expect(message.messageBox.width).toBeGreaterThan(0)
    expect(message.messageBox.top).toBeGreaterThanOrEqual(message.authorBox.bottom - 1)
    expect(message.messageBox.left).toBeGreaterThanOrEqual(message.contentBox.left - 1)
    expect(message.messageBox.right).toBeLessThanOrEqual(message.contentBox.right + 1)
    if (presetId === 'messenger') {
      expect(message.content.borderRadius).toBe('18px')
      expect(message.content.padding).toBe('8px 12px')
    } else if (presetId === 'stage') {
      expect(message.content.borderRadius).toBe('8px')
      expect(message.author.borderBottomWidth).toBe('1px')
      expect(message.message.padding).toBe('10px 12px')
    } else {
      expect(message.content.borderInlineStartWidth).toBe('2px')
      expect(message.renderer.borderBottomWidth).toBe('1px')
    }
  }
  return layout
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

      // Exercise clamping with a large delta, then return the synthetic pointer
      // to a browser-deliverable viewport coordinate before pointerup.
      await overlay.startDrag({ x: -200, y: -160 })
      await page.mouse.move(1, 1)
      const clampedCoordinates = { x: 10, y: 10 }
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

      await overlay.moveWithKeyboard('ArrowRight')
      await expectPersistedGeometry(
        storagePage,
        layoutGeometryToV2(
          { coordinates: { x: clampedCoordinates.x + 10, y: clampedCoordinates.y }, size: { width: 320, height: 240 } },
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

  test('keeps auto-hidden chat visible while the document has lost focus', { tag: '@fixture' }, async ({ page, extension }) => {
    expect(
      await patchOverlayStore(extension, {
        profile: { display: { idleVisibility: 'auto-hide' } },
      }),
    ).not.toBeNull()

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(scenarioState)
    await scenario.enterFullscreen()
    await overlay.expectSwitchReady({ timeout: 12000 })
    await overlay.expectChatLoaded({ timeout: 12000 })
    const viewport = overlay.chatViewport()
    await page.mouse.move(1100, 600)
    await expect(viewport).toHaveCSS('opacity', '0', { timeout: 3000 })

    await overlay.emulateDocumentFocus(false)
    await expect(viewport).toHaveCSS('opacity', '1')

    await overlay.emulateDocumentFocus(true)
    await expect(viewport).toHaveCSS('opacity', '0')
  })

  test('previews a held native text-size drag in the chat, then saves once and undoes once', { tag: '@fixture' }, async ({
    page,
    extension,
  }, testInfo) => {
    test.setTimeout(90000)
    const initialFontSize = 13
    expect(await patchOverlayStore(extension, {
      geometry: SEEDED_GEOMETRY,
      profile: { appearance: { fontSize: initialFontSize } },
    })).not.toBeNull()
    const storagePage = await openStoragePage(extension, page)
    let pointerHeld = false
    try {
      const readSavedFontSize = () => storagePage.evaluate(async key => {
        const stored = (await chrome.storage.local.get(key))[key] as {
          value?: { profile?: { appearance?: { fontSize?: number } } }
        } | undefined
        return stored?.value?.profile?.appearance?.fontSize ?? null
      }, APPEARANCE_STORAGE_KEY)
      await storagePage.evaluate(key => {
        const values: number[] = []
        Object.defineProperty(window, '__ylcAppearanceChanges', { configurable: true, value: values })
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area !== 'local' || !changes[key]) return
          const stored = changes[key].newValue as {
            value?: { profile?: { appearance?: { fontSize?: number } } }
          } | undefined
          const fontSize = stored?.value?.profile?.appearance?.fontSize
          if (typeof fontSize === 'number') values.push(fontSize)
        })
      }, APPEARANCE_STORAGE_KEY)
      const readAppearanceChanges = () => storagePage.evaluate(() =>
        (window as unknown as { __ylcAppearanceChanges: number[] }).__ylcAppearanceChanges,
      )
      const scenario = new YouTubeScenario(page)
      const overlay = new ExtensionOverlay(page)
      await scenario.load(scenarioState)
      await scenario.enterFullscreen()
      await overlay.expectChatLoaded({ timeout: 12000 })
      await overlay.installChatTypographyProbe()
      const readChatTypography = () => overlay.getChatTypographyState()
      await expect.poll(readChatTypography).toMatchObject({ variable: '13px', renderedFontSize: '13px' })
      const initialTypography = await readChatTypography()
      await overlay.openSettings()
      const settingsFrame = overlay.settingsFrame()
      await expect(settingsFrame.locator('.ylc-setting-panel')).toBeFocused()
      await expect(settingsFrame.getByRole('tab', { name: 'Settings', exact: true })).not.toBeFocused()
      await testInfo.attach('settings-initial-focus', { body: await page.screenshot(), contentType: 'image/png' })
      await expect(settingsFrame.locator('[data-ylc-runtime-diagnostics]')).toHaveCount(0)
      await expect(settingsFrame.getByText('Compatibility', { exact: true })).toHaveCount(0)
      await expect(settingsFrame.getByRole('button', { name: 'Copy diagnostic report', exact: true })).toHaveCount(0)
      await expect(settingsFrame.getByRole('button', { name: 'Reload chat overlay', exact: true })).toHaveCount(0)
      const slider = settingsFrame.getByRole('slider', { name: 'Text Size', exact: true })
      await slider.scrollIntoViewIfNeeded()
      await expect(slider).toHaveValue(String(initialFontSize))
      const undo = settingsFrame.getByRole('button', { name: 'Undo style change', exact: true })
      await expect(undo).toBeDisabled()
      await slider.evaluate(input => {
        const state = { downs: 0, ups: 0, heldMoves: 0 }
        Object.defineProperty(input, '__ylcPointerProbe', { configurable: true, value: state })
        input.addEventListener('pointerdown', () => { state.downs += 1 })
        input.addEventListener('pointermove', event => {
          if (((event as PointerEvent).buttons & 1) !== 0) state.heldMoves += 1
        })
        input.addEventListener('pointerup', () => { state.ups += 1 })
      })
      const box = await slider.boundingBox()
      if (!box) throw new Error('The native text-size slider has no browser bounding box.')
      // The native thumb is 16px wide; place the press on its current center.
      const trackStart = box.x + 8
      const trackWidth = box.width - 16
      const y = box.y + box.height / 2
      await page.mouse.move(trackStart + trackWidth * ((initialFontSize - 10) / 30), y)
      await page.mouse.down()
      pointerHeld = true
      let previewFontSize = initialFontSize
      for (const fraction of [0.4, 0.75]) {
        await page.mouse.move(trackStart + trackWidth * fraction, y, { steps: 8 })
        previewFontSize = Number(await slider.inputValue())
        expect(previewFontSize).toBeGreaterThan(initialFontSize)
        await expect(slider).toHaveAttribute('aria-valuetext', `${previewFontSize}px`)
        await expect.poll(readChatTypography).toMatchObject({
          variable: `${previewFontSize}px`, renderedFontSize: `${previewFontSize}px`,
        })
        expect(await readSavedFontSize()).toBe(initialFontSize)
        expect(await readAppearanceChanges()).toEqual([])
        expect(await slider.evaluate(input => {
          const state = (input as HTMLElement & { __ylcPointerProbe: { downs: number; ups: number; heldMoves: number } }).__ylcPointerProbe
          return { downs: state.downs, ups: state.ups, movedWhileHeld: state.heldMoves > 0 }
        })).toEqual({ downs: 1, ups: 0, movedWhileHeld: true })
      }
      expect((await readChatTypography()).messageHeight).toBeGreaterThan(initialTypography.messageHeight)
      await testInfo.attach('native-slider-held-preview', { body: await page.screenshot(), contentType: 'image/png' })
      await page.mouse.up()
      pointerHeld = false
      await expect.poll(readSavedFontSize).toBe(previewFontSize)
      await expect.poll(readAppearanceChanges).toEqual([previewFontSize])
      await expect(undo).toBeEnabled()
      await undo.click()
      await expect.poll(readSavedFontSize).toBe(initialFontSize)
      await expect.poll(readAppearanceChanges).toEqual([previewFontSize, initialFontSize])
      await expect.poll(readChatTypography).toMatchObject({ variable: '13px', renderedFontSize: '13px' })
      await expect(undo).toBeDisabled()
      await settingsFrame.getByRole('button', { name: 'Close', exact: true }).click()
      await expect(overlay.settingsDialog()).toHaveCount(0)
      await expect.poll(readChatTypography).toMatchObject({ variable: '13px', renderedFontSize: '13px' })
    } finally {
      if (pointerHeld) await page.mouse.up().catch(() => null)
      await storagePage.close()
    }
  })
})

 test('reaches settings without hover and returns to the trigger, then adjusts with clicks', async ({ page, extension }) => {
  await patchOverlayStore(extension, { geometry: SEEDED_GEOMETRY })
  const scenario = new YouTubeScenario(page)
  const overlay = new ExtensionOverlay(page)
  await scenario.load(scenarioState)
  await scenario.enterFullscreen()
  await overlay.expectChatLoaded({ timeout: 12000 })
  await page.mouse.move(1, 1)
  const settings = page.locator('[data-ylc-settings-btn]')
  // Start from the browser's current focus, without focusing a control in code.
  for (let step = 0; step < 40; step++) {
    await page.keyboard.press('Tab')
    if (await settings.evaluate(element => element.matches(':focus'))) break
  }
  await expect(settings).toBeFocused()
  await expect(page.locator('[data-ylc-control-rail]')).toHaveCSS('opacity', '1')
  await page.keyboard.press('Enter')
  await expect(overlay.settingsDialog()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(overlay.settingsDialog()).toHaveCount(0)
  await expect(settings).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-ylc-placement-panel]')).toBeVisible()
  await page.screenshot({ path: '/tmp/ylc-placement-open.png' })
  const before = await overlay.getGeometry()
  await page.getByRole('button', { name: 'Move down', exact: true }).click()
  await page.getByRole('button', { name: 'Increase width', exact: true }).click()
  await expect.poll(() => overlay.getGeometry()).toMatchObject({ y: before.y + 10, width: before.width + 10 })
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-ylc-placement-panel]')).toHaveCount(0)
  await expect.poll(() => overlay.getGeometry()).toMatchObject({ y: before.y + 10, width: before.width + 10 })
  await page.screenshot({ path: '/tmp/ylc-placement-closed.png' })
 })

 test('queries and retries the content session through the popup extension message boundary', async ({ page, extension }) => {
  const scenario = new YouTubeScenario(page)
  await scenario.load(scenarioState)
  await scenario.enterFullscreen()
  await new ExtensionOverlay(page).expectChatLoaded({ timeout: 12000 })
  const popup = await page.context().newPage()
  try {
    await popup.goto(extension.url('popup.html'))
    await page.bringToFront()
    const response = await popup.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id === undefined) throw new Error('No tab')
      const status = await chrome.tabs.sendMessage(tab.id, { type: 'ylc:status' }, { frameId: 0 })
      const retry = await chrome.tabs.sendMessage(tab.id, { type: 'ylc:retry', token: status.token }, { frameId: 0 })
      const stale = await chrome.tabs.sendMessage(tab.id, { type: 'ylc:retry', token: status.token }, { frameId: 0 })
      return { status, retry, stale }
    })
    expect(response.status.status).toBe('running')
    expect(response.status.report.schemaVersion).toBe(1)
    expect(JSON.stringify(response.status.report)).not.toContain(scenarioState.video.id)
    expect(response.retry.retry).toBe('accepted')
    expect(response.stale.retry).toBe('stale')
  } finally { await popup.close() }
 })


test('saves pasted CSS without applying, then reuses it after reopening the settings iframe', { tag: '@fixture' }, async ({ page, extension }) => {
  await patchOverlayStore(extension, { geometry: SEEDED_GEOMETRY })
  const envelope = (value: unknown) => ({ schemaVersion: 1, writerId: 'ylc-css-fixture', value })
  await extension.storage.set({
    [CUSTOM_CSS_STORAGE_KEY]: envelope({ enabled: false, css: '' }),
    [SAVED_CHAT_CSS_STORAGE_KEY]: envelope([]),
    [CUSTOM_CSS_SUSPENDED_STORAGE_KEY]: envelope(true),
  })
  const storagePage = await openStoragePage(extension, page)
  try {
    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(scenarioState)
    await scenario.enterFullscreen()
    await overlay.expectChatLoaded({ timeout: 12000 })
    await overlay.openSettings()
    const settings = overlay.settingsFrame()
    await settings.getByRole('tab', { name: 'Custom CSS', exact: true }).click()
    const editor = settings.getByRole('textbox', { name: 'CSS', exact: true })
    await expect(editor).toBeVisible()
    await expect(editor).toHaveValue('')
    const css = 'body { --ylc-saved-style-probe: purple; }'
    const name = 'Fixture CSS'
    await editor.fill(css)
    await settings.getByRole('button', { name: 'Save with a name', exact: true }).click()
    await settings.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
    await settings.getByRole('button', { name: 'Add to list', exact: true }).click()
    await expect(settings.getByRole('button', { name: `Use ${name}`, exact: true })).toBeVisible()
    const storedValue = async (key: string) => {
      return storagePage.evaluate(async storageKey => {
        const raw = (await chrome.storage.local.get(storageKey))[storageKey] as { value?: unknown } | undefined
        return raw?.value
      }, key)
    }
    await expect.poll(() => storedValue(SAVED_CHAT_CSS_STORAGE_KEY)).toEqual([{ id: expect.any(String), name, css }])
    expect(await storedValue(CUSTOM_CSS_STORAGE_KEY)).toEqual({ enabled: false, css: '' })
    const chat = page.frames().find(frame => /\/live_chat(?:[/?]|$)/.test(frame.url()))
    expect(chat).toBeDefined()
    await expect(chat!.locator('style[data-ylc-user-css]')).toHaveCount(0)

    await settings.getByRole('button', { name: 'Close', exact: true }).click()
    await settings.getByRole('button', { name: 'Discard draft and close', exact: true }).click()
    await expect(overlay.settingsDialog()).toHaveCount(0)
    await overlay.openSettings()
    await settings.getByRole('tab', { name: 'Custom CSS', exact: true }).click()
    await expect(editor).toHaveValue('')
    await settings.getByRole('button', { name: `Load ${name}`, exact: true }).click()
    await expect(editor).toHaveValue(css)
    expect(await storedValue(CUSTOM_CSS_STORAGE_KEY)).toEqual({ enabled: false, css: '' })
    await settings.getByRole('button', { name: `Use ${name}`, exact: true }).click()
    await expect.poll(() => storedValue(CUSTOM_CSS_STORAGE_KEY)).toEqual({ enabled: true, css })
    await expect.poll(() => storedValue(CUSTOM_CSS_SUSPENDED_STORAGE_KEY)).toBe(false)
    await expect(chat!.locator('style[data-ylc-user-css]')).toHaveJSProperty('textContent', css)
    await expect
      .poll(() => chat!.locator('body').evaluate(body => getComputedStyle(body).getPropertyValue('--ylc-saved-style-probe').trim()))
      .toBe('purple')
  } finally {
    await storagePage.close()
  }
})

test.describe('packaged message layouts in the actual chat iframe', { tag: ['@live', '@archive'] }, () => {
  for (const presetId of ['messenger', 'stage', 'timeline'] as const) {
    test(`applies ${presetId} through Settings and keeps its scope across managed live to borrowed replay`, { tag: '@fixture' }, async ({
      page, extension,
    }, testInfo) => {
      test.setTimeout(120000)
      const css = readFileSync(new URL(`../../../shared/settings/chatCssPresets/${presetId}.css`, import.meta.url), 'utf8')
      expect(await patchOverlayStore(extension, { geometry: SEEDED_GEOMETRY })).not.toBeNull()
      const envelope = (value: unknown) => ({ schemaVersion: 1, writerId: 'ylc-preset-layout-fixture', value })
      await extension.storage.set({
        [CUSTOM_CSS_STORAGE_KEY]: envelope({ enabled: false, css: '' }),
        [CUSTOM_CSS_SUSPENDED_STORAGE_KEY]: envelope(true),
      })
      const storagePage = await openStoragePage(extension, page)
      const fixture = new ChatCssLayoutFixture(page)
      const scenario = new YouTubeScenario(page)
      const overlay = new ExtensionOverlay(page)
      await scenario.load(scenarioState)
      await scenario.enterFullscreen()
      await overlay.expectChatLoaded({ timeout: 12000 })
      await expect.poll(() => scenario.observeExtensionIframeIdentity()).toMatchObject({ owned: 'true', managedCount: 1 })
      await fixture.captureCurrentDocument()
      try {
        await fixture.install()
        const before = await fixture.read()
        expect(before.sources).toEqual([])
        expect(before.messages).toHaveLength(2)
        const beforeFirst = before.messages[0]
        if (!beforeFirst) throw new Error('The chat fixture has no normal message before activation.')
        expect(beforeFirst.content.display).toBe('block')
        expect(beforeFirst.messageBox.top).toBeLessThan(beforeFirst.authorBox.bottom)

        await overlay.openSettings()
        const settings = overlay.settingsFrame()
        await settings.getByRole('tab', { name: 'Custom CSS', exact: true }).click()
        await settings.getByRole('combobox', { name: 'Choose a style', exact: true }).selectOption(`preset:${presetId}`)
        await expect(settings.getByRole('textbox', { name: 'CSS', exact: true })).toHaveValue(css)
        // Loading is page-local editing only; activation requires the real Use button.
        expect((await fixture.read()).sources).toEqual([])
        await settings.locator('[data-ylc-css-use]').click()
        await expect(settings.locator('[data-ylc-css-use]')).toBeDisabled()
        await expect.poll(() => storagePage.evaluate(async key => {
          const stored = (await chrome.storage.local.get(key))[key] as { value?: unknown } | undefined
          return stored?.value
        }, CUSTOM_CSS_STORAGE_KEY)).toEqual({ enabled: true, css })
        const live = await expectChatPresetLayout(fixture, presetId, css)
        expect(live.controls).toEqual(before.controls)
        expect(await fixture.mainDocumentStyleCount()).toBe(0)
        await expect(settings.locator('style[data-ylc-user-css]')).toHaveCount(0)
        await settings.getByRole('button', { name: 'Close', exact: true }).click()
        await expect(overlay.settingsDialog()).toHaveCount(0)
        await testInfo.attach(`${presetId}-managed-live`, { body: await page.screenshot(), contentType: 'image/png' })

        // Replay requires a playable native iframe. This replaces the managed live
        // Document at the same watch URL and must reuse the confirmed source.
        await scenario.endLiveAsArchive()
        await overlay.expectArchiveChatPlayable({ timeout: 12000 })
        await expect.poll(() => scenario.observeExtensionIframeIdentity()).toMatchObject({
          id: 'chatframe', owned: null, managedCount: 0, nativeCount: 0,
        })
        await expect.poll(() => scenario.observeExtensionIframeHref()).toContain('/live_chat_replay?')
        await expect.poll(() => fixture.previousDocumentStyleCount()).toBe(0)
        await fixture.install()
        const replay = await expectChatPresetLayout(fixture, presetId, css)
        expect(replay.controls).toEqual(before.controls)
        expect(await fixture.mainDocumentStyleCount()).toBe(0)
        await testInfo.attach(`${presetId}-borrowed-replay`, { body: await page.screenshot(), contentType: 'image/png' })

        // Returning the borrowed iframe removes the extension-owned source. A
        // later fullscreen lease restores exactly one source and the same layout.
        await scenario.exitFullscreen()
        await overlay.expectOverlayRemoved({ timeout: 12000 })
        await expect.poll(() => fixture.returnedNativeStyleCount()).toBe(0)
        await scenario.enterFullscreen()
        await overlay.expectArchiveChatPlayable({ timeout: 12000 })
        const reentered = await expectChatPresetLayout(fixture, presetId, css)
        expect(reentered.controls).toEqual(before.controls)
        await testInfo.attach(`${presetId}-computed-layouts`, {
          body: JSON.stringify({ before, live, replay, reentered }, null, 2), contentType: 'application/json',
        })
      } finally {
        await fixture.dispose()
        await storagePage.close()
      }
    })
  }
})
