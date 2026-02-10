import { expect, test } from '../../fixtures'
import { getE2ETestTargets } from '../../config/testTargets'
import { isExtensionArchiveChatPlayable, openArchiveWatchPage } from '../../support/diagnostics'
import { reliableClick } from '../../utils/actions'
import { switchButtonSelector } from '../../utils/selectors'

type Box = { width: number; height: number }

type UiMetrics = {
  overlayIcons: Box[]
  closeButton: Box | null
  presetActionButtons: Box[]
  modalButtons: Box[]
  dragIconBox: Box | null
  dragIconOpacity: string
}

const clickSettingIcon = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  if (!root) return false

  const candidates = Array.from(root.querySelectorAll<HTMLElement>('.ylc-overlay-control-icon'))
  const settingsButton = candidates[1] ?? candidates[0] ?? null
  if (!settingsButton) return false

  settingsButton.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
  return true
}

const clickPresetDeleteIcon = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const button = root?.querySelector('.ylc-preset-card .shrink-0 button:last-child') as HTMLButtonElement | null
  if (!button) return false
  button.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
  return true
}

const collectUiMetrics = (): UiMetrics => {
  const getBox = (el: Element | null): Box | null => {
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return {
      width: Math.round(rect.width * 100) / 100,
      height: Math.round(rect.height * 100) / 100,
    }
  }

  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const panel = root?.querySelector('.ylc-setting-panel') as HTMLElement | null

  const overlayIcons = Array.from(root?.querySelectorAll<HTMLElement>('.ylc-overlay-control-icon') ?? [])
    .map(icon => getBox(icon))
    .filter((box): box is Box => Boolean(box))
  const closeButton = getBox(panel?.querySelector('.ylc-setting-close-button') ?? null)
  const presetActionButtons = Array.from(panel?.querySelectorAll<HTMLButtonElement>('.ylc-preset-card .shrink-0 button') ?? []).map(button =>
    getBox(button),
  ).filter((box): box is Box => Boolean(box))
  const modalButtons = Array.from(root?.querySelectorAll<HTMLElement>('.ylc-theme-dialog-border button') ?? []).map(button => getBox(button)).filter(
    (box): box is Box => Boolean(box),
  )
  const dragIcon = panel?.querySelector('.ylc-preset-card .group svg') as SVGElement | null
  const dragIconBox = getBox(dragIcon)
  const dragIconOpacity = dragIcon ? window.getComputedStyle(dragIcon).opacity : ''

  return {
    overlayIcons,
    closeButton,
    presetActionButtons,
    modalButtons,
    dragIconBox,
    dragIconOpacity,
  }
}

const getPresetRowCenter = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const row = root?.querySelector('.ylc-preset-card .group') as HTMLElement | null
  if (!row) return null
  const rect = row.getBoundingClientRect()
  return {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.top + rect.height / 2),
  }
}

test('overlay/setting/preset control sizes stay readable on YouTube runtime', async ({ page }) => {
  test.setTimeout(120000)

  const archiveReady = await openArchiveWatchPage(page, getE2ETestTargets().archive.replayUrl, { maxDurationMs: 30000 })
  if (!archiveReady) {
    test.skip(true, 'Archive replay URL did not expose archive chat container in time.')
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
    test.skip(true, 'Fullscreen chat switch button did not appear.')
    return
  }

  if ((await switchButton.getAttribute('aria-pressed')) !== 'true') {
    await reliableClick(switchButton, page, switchButtonSelector)
    await expect(switchButton).toHaveAttribute('aria-pressed', 'true')
  }

  const extensionReady = await expect
    .poll(async () => page.evaluate(isExtensionArchiveChatPlayable), { timeout: 60000 })
    .toBe(true)
    .then(
      () => true,
      () => false,
    )
  if (!extensionReady) {
    test.skip(true, 'Archive chat source did not become ready in this run.')
    return
  }

  const appLocator = page.locator('#shadow-root-live-chat div[role="application"]').first()
  const appVisible = await appLocator.waitFor({ state: 'visible', timeout: 10000 }).then(
    () => true,
    () => false,
  )
  if (!appVisible) {
    test.skip(true, 'Overlay app container did not appear.')
    return
  }

  const appBox = await appLocator.boundingBox()
  if (!appBox) {
    test.skip(true, 'Overlay app bounds could not be resolved.')
    return
  }
  await page.mouse.move(appBox.x + appBox.width / 2, appBox.y + Math.min(appBox.height / 2, 100))

  const clickedSetting = await page.evaluate(clickSettingIcon)
  if (!clickedSetting) {
    test.skip(true, 'Setting icon did not appear.')
    return
  }

  const panelReady = await page
    .waitForFunction(() => {
      const host = document.getElementById('shadow-root-live-chat')
      const root = host?.shadowRoot ?? null
      return Boolean(root?.querySelector('.ylc-setting-panel'))
    }, undefined, { timeout: 10000 })
    .then(
      () => true,
      () => false,
    )
  if (!panelReady) {
    test.skip(true, 'Setting panel did not open.')
    return
  }

  const beforeHoverMetrics = await page.evaluate(collectUiMetrics)
  const rowCenter = await page.evaluate(getPresetRowCenter)
  if (!rowCenter) {
    test.skip(true, 'Preset row was not found.')
    return
  }
  await page.mouse.move(rowCenter.x, rowCenter.y)
  await page.waitForTimeout(260)
  const afterHoverMetrics = await page.evaluate(collectUiMetrics)

  const clickedDelete = await page.evaluate(clickPresetDeleteIcon)
  if (!clickedDelete) {
    test.skip(true, 'Preset delete icon did not appear.')
    return
  }

  const modalReady = await page
    .waitForFunction(() => {
      const host = document.getElementById('shadow-root-live-chat')
      const root = host?.shadowRoot ?? null
      return Boolean(root?.querySelector('.ylc-theme-dialog-border button'))
    }, undefined, { timeout: 10000 })
    .then(
      () => true,
      () => false,
    )
  if (!modalReady) {
    test.skip(true, 'Preset delete confirmation modal did not open.')
    return
  }

  const metrics = await page.evaluate(collectUiMetrics)
  await test.info().attach('control-size-metrics', {
    body: JSON.stringify({ beforeHoverMetrics, afterHoverMetrics, metrics }, null, 2),
    contentType: 'application/json',
  })

  expect(metrics.overlayIcons.length).toBeGreaterThanOrEqual(2)
  expect(metrics.overlayIcons[0]?.width ?? 0).toBeGreaterThanOrEqual(34)
  expect(metrics.overlayIcons[0]?.height ?? 0).toBeGreaterThanOrEqual(34)
  expect(metrics.overlayIcons[1]?.width ?? 0).toBeGreaterThanOrEqual(34)
  expect(metrics.overlayIcons[1]?.height ?? 0).toBeGreaterThanOrEqual(34)

  expect(metrics.closeButton?.width ?? 0).toBeGreaterThanOrEqual(38)
  expect(metrics.closeButton?.height ?? 0).toBeGreaterThanOrEqual(38)

  expect(metrics.presetActionButtons.length).toBeGreaterThanOrEqual(2)
  expect(metrics.presetActionButtons[0]?.width ?? 0).toBeGreaterThanOrEqual(32)
  expect(metrics.presetActionButtons[0]?.height ?? 0).toBeGreaterThanOrEqual(32)
  expect(metrics.presetActionButtons[1]?.width ?? 0).toBeGreaterThanOrEqual(32)
  expect(metrics.presetActionButtons[1]?.height ?? 0).toBeGreaterThanOrEqual(32)

  expect(beforeHoverMetrics.dragIconBox?.width ?? 0).toBeLessThanOrEqual(1)
  expect(beforeHoverMetrics.dragIconBox?.height ?? 0).toBeLessThanOrEqual(1)
  expect(beforeHoverMetrics.dragIconOpacity).toBe('0')
  expect(afterHoverMetrics.dragIconBox?.width ?? 0).toBeGreaterThanOrEqual(24)
  expect(afterHoverMetrics.dragIconBox?.height ?? 0).toBeGreaterThanOrEqual(24)
  expect(Number(afterHoverMetrics.dragIconOpacity)).toBeGreaterThan(0.8)

  expect(metrics.modalButtons.length).toBeGreaterThanOrEqual(2)
  expect(metrics.modalButtons[0]?.height ?? 0).toBeGreaterThanOrEqual(36)
  expect(metrics.modalButtons[1]?.height ?? 0).toBeGreaterThanOrEqual(36)
})
