import { readFile } from 'node:fs/promises'
import { expect, test } from '@e2e/fixtures'
import { blockExternalNetwork } from '@e2e/fixtures/deterministic'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { openDeterministicOverlay } from '@e2e/support/deterministicSurfaces'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { importSettingsViaPopup, readStorageEntry } from '@e2e/utils/popupHelpers'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import { DEFAULT_CHAT_SETTINGS } from '../../../shared/settings/migrateSettings'
import type { ChatGeometryV2, ChatProfile, ChatSettings, PresetEntry } from '../../../shared/settings/model'
import { SETTINGS_EXPORT_VERSION } from '../../../shared/settings/persistConfig'
import { APPEARANCE_STORAGE_KEY, ENABLED_STORAGE_KEY, LOCALE_STORAGE_KEY, THEME_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const activeOverlayScenario = {
  video: { id: 'ylc-import-active-overlay', title: 'Active overlay import fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'live',
    native: { state: 'absent' },
    response: 'playable',
  },
} satisfies YouTubeScenarioState

type AppearanceValue = { profile: ChatProfile; presets: PresetEntry[] }

const profileWithFontSize = (fontSize: number): ChatProfile => ({
  appearance: {
    ...DEFAULT_CHAT_SETTINGS.profile.appearance,
    backgroundColor: { ...DEFAULT_CHAT_SETTINGS.profile.appearance.backgroundColor },
    fontColor: { ...DEFAULT_CHAT_SETTINGS.profile.appearance.fontColor },
    membershipNameColor: { mode: 'youtube-default' },
    fontSize,
  },
  display: { ...DEFAULT_CHAT_SETTINGS.profile.display },
})

const importedSettings = (
  fontSize: number,
  customPreset: PresetEntry,
  geometry: ChatGeometryV2 = { reference: 'player', rect: { x: 0.125, y: 0.125, width: 0.25, height: 0.375 }, pinned: true },
): ChatSettings => ({
  profile: profileWithFontSize(fontSize),
  geometry,
  presets: [{ kind: 'builtin', id: 'standard' }, customPreset],
})

test.describe('popup', { tag: '@popup' }, () => {
  for (const { locale, backupNames, themeNames } of [
    { locale: 'en', backupNames: ['Export', 'Import'], themeNames: ['Auto', 'Light', 'Dark'] },
    { locale: 'ja', backupNames: ['書き出し', '読み込み'], themeNames: ['自動', 'ライト', 'ダーク'] },
    { locale: 'ar', backupNames: ['تصدير', 'استيراد'], themeNames: ['تلقائي', 'فاتح', 'داكن'] },
  ]) {
    test(`popup controls keep visible labels and fit narrow viewports: ${locale}`, async ({ page, extension }, testInfo) => {
      const originalViewport = page.viewportSize()
      await extension.storage.set({
        [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'popup-layout-fixture', value: locale },
      })
      await page.goto(extension.url('popup.html'))
      await expect(page.getByRole('combobox')).toHaveValue(locale)
      await expect(page.locator('#root > [dir]')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
      await expect(page.locator('a[href="https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/"]')).toBeVisible()

      for (const width of [450, 400, 360, 320]) {
        await page.setViewportSize({ width, height: 650 })
        for (const name of backupNames) {
          const button = page.getByRole('button', { name, exact: true })
          await expect(button.getByText(name, { exact: true })).toBeVisible()
          const bounds = await button.boundingBox()
          expect(bounds?.width).toBeGreaterThanOrEqual(44)
          expect(bounds?.height).toBeGreaterThanOrEqual(44)
        }
        for (const name of [
          ...(locale === 'ja' ? ['Firefox 版'] : ['Firefox edition']),
          ...(locale === 'ja' ? ['レビューを書く', 'GitHub で Star'] : ['Write a review', 'Star on GitHub']),
        ]) {
          const link = page.getByRole('link', { name, exact: true })
          await expect(link.getByText(name, { exact: true })).toBeVisible()
          const bounds = await link.boundingBox()
          expect(bounds?.width).toBeGreaterThanOrEqual(44)
          expect(bounds?.height).toBeGreaterThanOrEqual(44)
        }
        for (const name of themeNames) {
          await expect(page.getByText(name, { exact: true })).toBeVisible()
        }
        await expect
          .poll(() =>
            page.evaluate(() => ({
              overflow: document.documentElement.scrollWidth - window.innerWidth,
              clippedControls: [...document.querySelectorAll('a, button, select, label')].filter(control => {
                const bounds = control.getBoundingClientRect()
                return bounds.width > 0 && (bounds.left < -1 || bounds.right > window.innerWidth + 1)
              }).length,
            })),
          )
          .toEqual({ overflow: 0, clippedControls: 0 })
      }
      await testInfo.attach(`popup-${locale}-320px`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
      if (originalViewport) await page.setViewportSize(originalViewport)
    })
  }

  test('popup theme choices support native keyboard selection and keep the saved theme after reopening', async ({ page, extension }) => {
    await page.goto(extension.url('popup.html'))
    const system = page.getByRole('radio', { name: 'Auto', exact: true })
    await expect(system).toBeChecked()
    await system.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Light', exact: true })).toBeChecked()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked()
    await expect.poll(async () => (await readStorageEntry<string>(page, THEME_STORAGE_KEY))?.value).toBe('dark')
    await page.reload()
    await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked()
    await expect(page.locator('#root > [data-ylc-theme]')).toHaveAttribute('data-ylc-theme', 'dark')
  })

  for (const locale of ['en', 'ja', 'ar']) {
    test(`settings content fits horizontally: ${locale}`, async ({ page, extension }) => {
      await extension.storage.set({
        [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'settings-layout-fixture', value: locale },
      })
      await openDeterministicOverlay(page)
      const hostLanguage = await page.locator('html').getAttribute('lang')
      const hostDirection = await page.locator('html').getAttribute('dir')
      const overlay = new ExtensionOverlay(page)
      await overlay.frame().hover()
      await page.locator('[data-ylc-settings-btn]').click()
      await expect(overlay.settingsDialog()).toBeVisible()
      const frame = overlay.settingsFrame()
      await expect(frame.locator('.ylc-setting-panel')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
      await expect(frame.locator('html')).toHaveAttribute('lang', locale)
      await expect(frame.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
      expect(await page.locator('html').getAttribute('lang')).toBe(hostLanguage)
      expect(await page.locator('html').getAttribute('dir')).toBe(hostDirection)
      const content = frame.getByRole('tabpanel')
      await expect(content.locator('.ylc-setting-group-legend')).toHaveCount(4)
      const horizontalOverflow = () =>
        content.evaluate(panel => {
          const bounds = panel.getBoundingClientRect()
          return {
            excessWidth: panel.scrollWidth - panel.clientWidth,
            overflowingHeadings: [...panel.querySelectorAll('legend')].filter(heading => {
              const rect = heading.getBoundingClientRect()
              return rect.left < bounds.left - 1 || rect.right > bounds.right + 1
            }).length,
          }
        })
      await expect.poll(horizontalOverflow).toEqual({ excessWidth: 0, overflowingHeadings: 0 })
      await content.hover()
      await page.mouse.wheel(0, 400)
      await expect.poll(() => content.evaluate(panel => panel.scrollTop)).toBeGreaterThan(0)
      await frame.getByRole('tab').nth(1).click()
      await expect(frame.locator('[data-ylc-preset-item]')).toHaveCount(7)
      expect(
        await frame.locator('[data-ylc-preset-item]').evaluateAll(items => items.map(item => item.getAttribute('data-ylc-preset-item'))),
      ).toEqual(['standard', 'transparent', 'simple', 'dark', 'readable', 'compact', 'neon'])
    })
  }

  test('blocks unmocked HTTP and HTTPS requests while extension pages remain usable', async ({ page, context, extension }) => {
    const browser = context.browser()
    if (!browser) throw new Error('The fixture must expose its browser connection.')
    const probeContext = await browser.newContext({ serviceWorkers: 'block' })
    const escapedRequests: string[] = []
    try {
      // A missing blocker must succeed through this offline fallback. Connection
      // failure alone would also pass when the network or host is unavailable.
      await probeContext.route('**/*', async route => {
        escapedRequests.push(route.request().url())
        await route.fulfill({ contentType: 'text/html', body: '<title>Unexpected network access</title>' })
      })
      await blockExternalNetwork(probeContext)
      for (const url of ['http://network-sentinel.invalid/', 'https://network-sentinel.invalid/']) {
        const probe = await probeContext.newPage()
        try {
          await expect(probe.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 })).rejects.toThrow()
        } finally {
          await probe.close()
        }
      }
      expect(escapedRequests).toEqual([])
      const local = await probeContext.newPage()
      await local.goto('data:text/html,<title>Local page</title>')
      await expect(local).toHaveTitle('Local page')

      await page.goto(extension.url('popup.html'))
      await expect(page.getByLabel('Select language')).toBeVisible()
    } finally {
      await probeContext.close()
    }
  })

  test('keeps font search composition separate from committing the highlighted option', async ({ page, extension }) => {
    expect(await patchOverlayStore(extension, { profile: { appearance: { fontFamily: 'Roboto' } } })).not.toBeNull()
    await page.goto(extension.url('settings.html'))
    const trigger = page.getByRole('button', { name: 'Font', exact: true })
    const undo = page.getByRole('button', { name: 'Undo style change', exact: true })
    const savedFont = async () =>
      (await readStorageEntry<AppearanceValue>(page, APPEARANCE_STORAGE_KEY))?.value.profile.appearance.fontFamily
    await trigger.click()
    const search = page.getByRole('combobox', { name: 'Search fonts', exact: true })
    await expect(search).toBeFocused()
    const cdp = await page.context().newCDPSession(page)
    try {
      await cdp.send('Input.imeSetComposition', { text: 'Roboto Slab', selectionStart: 11, selectionEnd: 11 })
      await expect(page.getByRole('option', { name: 'Roboto Slab', exact: true })).toBeVisible()
      await page.keyboard.press('Enter')

      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(await savedFont()).toBe('Roboto')
      await expect(undo).toBeDisabled()

      await cdp.send('Input.insertText', { text: 'Roboto Slab' })
      await page.keyboard.press('Enter')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(trigger).toHaveText('Roboto Slab')
      await expect.poll(savedFont).toBe('Roboto Slab')
      await undo.click()
      await expect.poll(savedFont).toBe('Roboto')
    } finally {
      await cdp.detach()
    }
  })

  test('popup chat toggle persists across reopening', async ({ page, extension }) => {
    test.setTimeout(90000)

    await page.goto(extension.url('popup.html'))

    const languageSelect = page.getByLabel('Select language')
    await expect(languageSelect).toBeVisible()
    const optionCount = await languageSelect.locator('option').count()
    expect(optionCount).toBeGreaterThan(1)

    const chatToggle = page.locator('[role="switch"]')
    await expect(chatToggle).toHaveCount(1)

    await expect(chatToggle).toHaveAttribute('aria-checked', 'true')
    await chatToggle.click()
    await expect(chatToggle).toHaveAttribute('aria-checked', 'false')
    await expect.poll(async () => (await readStorageEntry<boolean>(page, ENABLED_STORAGE_KEY))?.value).toBe(false)

    await page.reload()
    await expect(chatToggle).toHaveAttribute('aria-checked', 'false')
    await chatToggle.click()
    await expect(chatToggle).toHaveAttribute('aria-checked', 'true')
    await expect.poll(async () => (await readStorageEntry<boolean>(page, ENABLED_STORAGE_KEY))?.value).toBe(true)

    await page.reload()
    await expect(chatToggle).toHaveAttribute('aria-checked', 'true')

    const donateLink = page.locator('a[href*="ko-fi.com"]')
    await expect(donateLink).toHaveCount(1)
  })

  test('imports settings, hydrates them on reopen, and exports the chosen values as a real download', async ({ page, extension }) => {
    test.setTimeout(90000)

    const longId = 'a'.repeat(128)
    const occupied = `${'a'.repeat(126)}-2`
    const expectedPresets = [
      { kind: 'custom', id: occupied, name: 'First', profile: { appearance: { fontSize: 18 } } },
      { kind: 'custom', id: longId, name: 'Repeated', profile: { appearance: { fontSize: 24 } } },
      { kind: 'custom', id: `${'a'.repeat(126)}-3`, name: 'Repeated', profile: { appearance: { fontSize: 24 } } },
    ]
    const settings = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      globalSetting: { ytdLiveChat: false, themeMode: 'dark' },
      ytdLiveChat: {
        fontSize: 42,
        blur: 10,
        alwaysOnDisplay: false,
        presetItemIds: [occupied, longId, longId],
        presetItemStyles: { [occupied]: { fontSize: 18 }, [longId]: { fontSize: 24 } },
        presetItemTitles: { [occupied]: 'First', [longId]: 'Repeated' },
      },
    }

    await importSettingsViaPopup(page, extension, settings)

    await expect.poll(async () => (await readStorageEntry<string>(extension, THEME_STORAGE_KEY))?.value ?? null).toBe('dark')

    const enabledState = await readStorageEntry<boolean>(extension, ENABLED_STORAGE_KEY)
    expect(enabledState?.value).toBe(false)
    expect(enabledState?.schemaVersion).toBe(1)

    const themeState = await readStorageEntry<string>(extension, THEME_STORAGE_KEY)
    expect(themeState?.value).toBe('dark')
    expect(themeState?.schemaVersion).toBe(1)

    const appearanceState = await readStorageEntry<AppearanceValue>(extension, APPEARANCE_STORAGE_KEY)
    expect(appearanceState?.value.profile.appearance.fontSize).toBe(40)
    expect(appearanceState?.value.profile.appearance.blur).toBe(10)
    expect(appearanceState?.value.profile.display.idleVisibility).toBe('auto-hide')
    expect(appearanceState?.value.presets).toMatchObject(expectedPresets)
    expect(appearanceState?.schemaVersion).toBe(1)

    // Reopen popup and verify runtime hydration.
    await page.goto(extension.url('popup.html'))
    await page.getByLabel('Select language').waitFor({ state: 'visible' })
    await expect(page.locator('[role="switch"]')).toHaveAttribute('aria-checked', 'false')

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export', exact: true }).click()])
    expect(download.suggestedFilename()).toMatch(/^yt-livechat-fullscreen-backup-\d{4}-\d{2}-\d{2}\.json$/)
    expect(await download.failure()).toBeNull()
    const downloadedPath = await download.path()
    if (!downloadedPath) throw new Error('The settings export did not produce a downloaded file.')
    const backup = JSON.parse(await readFile(downloadedPath, 'utf8'))
    expect(Object.keys(backup).sort()).toEqual(['chatSettings', 'exportedAt', 'globalSetting', 'version'])
    expect(backup).toMatchObject({
      version: 2,
      globalSetting: { ytdLiveChat: false, themeMode: 'dark' },
      chatSettings: {
        profile: {
          appearance: { fontSize: 40, blur: 10 },
          display: { idleVisibility: 'auto-hide' },
        },
        presets: expectedPresets,
      },
    })
    expect(Number.isNaN(Date.parse(backup.exportedAt))).toBe(false)
  })

  test('rejects a compact legacy backup with excessive duplicate presets before confirmation', async ({ page, extension }) => {
    await page.goto(extension.url('popup.html'))
    await page.getByLabel('Select language').waitFor({ state: 'visible' })
    const before = await extension.storage.get()
    const buffer = Buffer.from(
      JSON.stringify({
        version: 1,
        globalSetting: { ytdLiveChat: false, themeMode: 'dark' },
        ytdLiveChat: { presetItemIds: Array(8000).fill('a'), presetItemStyles: { a: {} } },
      }),
    )
    expect(buffer.byteLength).toBeLessThan(40000)

    await page.locator('input[type="file"]').setInputFiles({
      name: 'duplicate-presets.json',
      mimeType: 'application/json',
      buffer,
    })

    await expect(page.getByText("Couldn't import this settings file.", { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Apply', exact: true })).toHaveCount(0)
    expect(await extension.storage.get()).toEqual(before)
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.getByText("Couldn't import this settings file.", { exact: true })).toHaveCount(0)
  })

  test('saved presets remain editable, reorderable, and applicable in settings', async ({ page, extension }) => {
    test.setTimeout(90000)

    await importSettingsViaPopup(page, extension, {
      version: SETTINGS_EXPORT_VERSION,
      exportedAt: '2026-10-18T00:00:00.000Z',
      globalSetting: { ytdLiveChat: true, themeMode: 'dark' },
      chatSettings: importedSettings(27, {
        kind: 'custom',
        id: 'existing-style',
        name: 'Existing style',
        profile: profileWithFontSize(18),
      }),
    })

    await page.goto(extension.url('settings.html'))
    await page.getByRole('tab', { name: 'Presets', exact: true }).click()
    await page.getByRole('button', { name: 'Save Current Settings', exact: true }).click()

    const presetNames = page.getByRole('textbox', { name: 'Preset name', exact: true })
    await expect(presetNames).toHaveCount(3)
    const savedName = presetNames.nth(2)
    await expect(savedName).toHaveValue('Untitled')
    await savedName.fill('Reading layout')
    await savedName.press('Tab')

    const reorderSaved = page.getByRole('button', { name: 'Reorder Reading layout', exact: true })
    const displayedPresetNames = () => presetNames.evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value))
    // Read in this extension page so checking storage never blurs a held gesture.
    const storedPresetNames = async () =>
      (await readStorageEntry<AppearanceValue>(page, APPEARANCE_STORAGE_KEY))?.value.presets.map(preset =>
        preset.kind === 'builtin' ? preset.id : preset.name,
      )
    await reorderSaved.focus()
    await page.keyboard.press('ArrowUp')
    await expect.poll(displayedPresetNames).toEqual(['Standard', 'Reading layout', 'Existing style'])
    await expect.poll(storedPresetNames).toEqual(['standard', 'Reading layout', 'Existing style'])

    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowUp')
    await expect.poll(displayedPresetNames).toEqual(['Reading layout', 'Standard', 'Existing style'])
    expect(await storedPresetNames()).toEqual(['standard', 'Reading layout', 'Existing style'])
    await page.keyboard.press('Escape')
    await expect.poll(displayedPresetNames).toEqual(['Standard', 'Reading layout', 'Existing style'])

    const firstRow = page.locator('[data-ylc-preset-item]').first()
    const handleBox = await reorderSaved.boundingBox()
    const firstRowBox = await firstRow.boundingBox()
    if (!handleBox || !firstRowBox) throw new Error('Missing visible preset reorder targets')
    const pointerX = handleBox.x + handleBox.width / 2
    await page.mouse.move(pointerX, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(pointerX, firstRowBox.y + firstRowBox.height / 4, { steps: 4 })
    await expect.poll(displayedPresetNames).toEqual(['Reading layout', 'Standard', 'Existing style'])
    expect(await storedPresetNames()).toEqual(['standard', 'Reading layout', 'Existing style'])
    await page.mouse.up()
    await expect.poll(storedPresetNames).toEqual(['Reading layout', 'standard', 'Existing style'])

    const movedHandleBox = await reorderSaved.boundingBox()
    const lastRowBox = await page.locator('[data-ylc-preset-item]').last().boundingBox()
    if (!movedHandleBox || !lastRowBox) throw new Error('Missing visible preset cancellation targets')
    await page.mouse.move(pointerX, movedHandleBox.y + movedHandleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(pointerX, lastRowBox.y + (lastRowBox.height * 3) / 4, { steps: 4 })
    await expect.poll(displayedPresetNames).toEqual(['Standard', 'Existing style', 'Reading layout'])
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await expect.poll(displayedPresetNames).toEqual(['Reading layout', 'Standard', 'Existing style'])
    expect(await storedPresetNames()).toEqual(['Reading layout', 'standard', 'Existing style'])

    await reorderSaved.focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(reorderSaved).toBeFocused()
    await expect.poll(displayedPresetNames).toEqual(['Standard', 'Reading layout', 'Existing style'])
    await expect.poll(storedPresetNames).toEqual(['standard', 'Reading layout', 'Existing style'])

    await page.getByRole('button', { name: 'Apply Existing style', exact: true }).click()
    await expect
      .poll(async () => (await readStorageEntry<AppearanceValue>(extension, APPEARANCE_STORAGE_KEY))?.value.profile.appearance.fontSize)
      .toBe(18)
    await page.getByRole('button', { name: 'Apply Reading layout', exact: true }).click()
    await expect
      .poll(async () => (await readStorageEntry<AppearanceValue>(extension, APPEARANCE_STORAGE_KEY))?.value.profile.appearance.fontSize)
      .toBe(27)
    await page.getByRole('tab', { name: 'Settings', exact: true }).click()
    await expect(page.getByRole('slider', { name: 'Text Size', exact: true })).toHaveValue('27')
  })

  test('repeated imports update an active overlay and replace custom presets', async ({ page, extension }) => {
    test.setTimeout(120000)

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(activeOverlayScenario)
    await scenario.enterFullscreen()
    await overlay.expectSwitchReady({ timeout: 12000 })
    await overlay.expectChatLoaded({ timeout: 12000 })
    await overlay.installChatTypographyProbe()

    const popup = await page.context().newPage()
    const firstPreset: PresetEntry = {
      kind: 'custom',
      id: 'first-import',
      name: 'First import',
      profile: profileWithFontSize(22),
    }
    const secondPreset: PresetEntry = {
      kind: 'custom',
      id: 'replacement-import',
      name: 'Replacement import',
      profile: profileWithFontSize(31),
    }
    const importBackup = (chatSettings: ChatSettings) => ({
      version: SETTINGS_EXPORT_VERSION,
      exportedAt: '2026-07-28T00:00:00.000Z',
      globalSetting: { ytdLiveChat: true, themeMode: 'dark' },
      chatSettings,
    })

    try {
      const first = importedSettings(22, firstPreset)
      await importSettingsViaPopup(popup, extension, importBackup(first))
      await page.bringToFront()
      await expect.poll(() => overlay.getChatTypographyState()).toMatchObject({ variable: '22px', renderedFontSize: '22px' })
      // The backup stores player ratios. These fixed pixels are the independent
      // contract for a 1280 × 720 player, not output from the geometry renderer.
      await expect
        .poll(() => overlay.getGeometry())
        .toMatchObject({
          x: 160,
          y: 90,
          width: 320,
          height: 270,
        })

      const second = importedSettings(31, secondPreset, {
        reference: 'player',
        rect: { x: 0.25, y: 0.25, width: 0.375, height: 0.5 },
        pinned: true,
      })
      await importSettingsViaPopup(popup, extension, importBackup(second))
      await page.bringToFront()
      await expect.poll(() => overlay.getChatTypographyState()).toMatchObject({ variable: '31px', renderedFontSize: '31px' })
      await expect
        .poll(() => overlay.getGeometry())
        .toMatchObject({
          x: 320,
          y: 180,
          width: 480,
          height: 360,
        })
      await expect
        .poll(async () => (await readStorageEntry<AppearanceValue>(extension, APPEARANCE_STORAGE_KEY))?.value.presets)
        .toEqual(second.presets)

      // The file input is reset after every import, so importing the same file again
      // must still complete and keep the replacement set stable.
      await importSettingsViaPopup(popup, extension, importBackup(second))
      await page.bringToFront()
      await expect
        .poll(async () => (await readStorageEntry<AppearanceValue>(extension, APPEARANCE_STORAGE_KEY))?.value.presets)
        .toEqual(second.presets)
      expect((await readStorageEntry<AppearanceValue>(extension, APPEARANCE_STORAGE_KEY))?.value.presets).not.toContainEqual(firstPreset)
    } finally {
      await popup.close()
      await page.bringToFront()
    }
  })
})
