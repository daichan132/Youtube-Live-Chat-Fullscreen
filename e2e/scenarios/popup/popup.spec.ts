import { readFile } from 'node:fs/promises'
import { expect, test } from '@e2e/fixtures'
import { blockExternalNetwork } from '@e2e/fixtures/deterministic'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { openDeterministicOverlay } from '@e2e/support/deterministicSurfaces'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { importSettingsViaPopup, readStorageEntry } from '@e2e/utils/popupHelpers'
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
  for (const locale of ['en', 'ja', 'ar']) {
    test(`settings content fits horizontally: ${locale}`, async ({ page, extension }) => {
      await extension.storage.set({
        [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'settings-layout-fixture', value: locale },
      })
      await openDeterministicOverlay(page)
      const overlay = new ExtensionOverlay(page)
      await overlay.frame().hover()
      await page.locator('[data-ylc-settings-btn]').click()
      await expect(overlay.settingsDialog()).toBeVisible()
      const frame = overlay.settingsFrame()
      await expect(frame.locator('.ylc-setting-panel')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
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

  test('popup renders language selector and chat toggle', async ({ page, extension }) => {
    test.setTimeout(90000)

    await page.goto(extension.url('popup.html'))

    const languageSelect = page.getByLabel('Select language')
    await expect(languageSelect).toBeVisible()
    const optionCount = await languageSelect.locator('option').count()
    expect(optionCount).toBeGreaterThan(1)

    const chatToggle = page.locator('[role="switch"]')
    await expect(chatToggle).toHaveCount(1)

    const initialChecked = await chatToggle.getAttribute('aria-checked')

    await chatToggle.click()
    await expect.poll(async () => chatToggle.getAttribute('aria-checked')).toBe(initialChecked === 'true' ? 'false' : 'true')
    await chatToggle.click()
    await expect.poll(async () => chatToggle.getAttribute('aria-checked')).toBe(initialChecked)

    const donateLink = page.locator('a[href*="ko-fi.com"]')
    await expect(donateLink).toHaveCount(1)
  })

  test('imports settings, hydrates them on reopen, and exports the chosen values as a real download', async ({ page, extension }) => {
    test.setTimeout(90000)

    const settings = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      globalSetting: { ytdLiveChat: false, themeMode: 'dark' },
      ytdLiveChat: { fontSize: 42, blur: 10, alwaysOnDisplay: false },
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
      },
    })
    expect(Number.isNaN(Date.parse(backup.exportedAt))).toBe(false)
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
    await reorderSaved.focus()
    await page.keyboard.press('ArrowUp')
    await expect
      .poll(() => presetNames.evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value)))
      .toEqual(['Standard', 'Reading layout', 'Existing style'])
    await expect
      .poll(async () =>
        (await readStorageEntry<AppearanceValue>(extension, APPEARANCE_STORAGE_KEY))?.value.presets.map(preset =>
          preset.kind === 'builtin' ? preset.id : preset.name,
        ),
      )
      .toEqual(['standard', 'Reading layout', 'Existing style'])

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
      await expect.poll(() => overlay.getAppliedFontSize()).toBe('22px')
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
      await expect.poll(() => overlay.getAppliedFontSize()).toBe('31px')
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
