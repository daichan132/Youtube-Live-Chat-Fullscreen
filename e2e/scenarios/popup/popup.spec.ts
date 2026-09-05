import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { importSettingsViaPopup, readStorageEntry } from '@e2e/utils/popupHelpers'
import { layoutGeometryToV2, renderChatGeometry } from '../../../shared/settings/chatGeometry'
import { DEFAULT_CHAT_SETTINGS } from '../../../shared/settings/migrateSettings'
import type { ChatProfile, ChatSettings, PresetEntry } from '../../../shared/settings/model'
import { SETTINGS_EXPORT_VERSION } from '../../../shared/settings/persistConfig'
import { APPEARANCE_STORAGE_KEY, ENABLED_STORAGE_KEY, THEME_STORAGE_KEY } from '../../../shared/settings/storageKeys'

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

const importedSettings = (fontSize: number, customPreset: PresetEntry): ChatSettings => ({
  profile: profileWithFontSize(fontSize),
  geometry: layoutGeometryToV2(
    {
      coordinates: { x: 80 + fontSize, y: 60 + fontSize },
      size: { width: 320 + fontSize, height: 240 + fontSize },
    },
    { width: 1280, height: 720 },
    true,
  ),
  presets: [{ kind: 'builtin', id: 'standard' }, customPreset],
})

test.describe('popup', { tag: '@popup' }, () => {
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

  test('import persists settings and reflects on reopen', async ({ page, extension }) => {
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
      const firstLayout = renderChatGeometry(first.geometry, { width: 1280, height: 720 })
      await importSettingsViaPopup(popup, extension, importBackup(first))
      await page.bringToFront()
      await expect.poll(() => overlay.getAppliedFontSize()).toBe('22px')
      await expect
        .poll(() => overlay.getGeometry())
        .toMatchObject({
          x: firstLayout.coordinates.x,
          y: firstLayout.coordinates.y,
          width: firstLayout.size.width,
          height: firstLayout.size.height,
        })

      const second = importedSettings(31, secondPreset)
      const secondLayout = renderChatGeometry(second.geometry, { width: 1280, height: 720 })
      await importSettingsViaPopup(popup, extension, importBackup(second))
      await page.bringToFront()
      await expect.poll(() => overlay.getAppliedFontSize()).toBe('31px')
      await expect
        .poll(() => overlay.getGeometry())
        .toMatchObject({
          x: secondLayout.coordinates.x,
          y: secondLayout.coordinates.y,
          width: secondLayout.size.width,
          height: secondLayout.size.height,
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
