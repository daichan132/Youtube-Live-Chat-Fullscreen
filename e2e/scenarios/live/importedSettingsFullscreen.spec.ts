import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { hasCanaryPrecondition } from '@e2e/support/canaryPreconditions'
import { importSettingsViaPopup, readStorageEntry } from '@e2e/utils/popupHelpers'
import { CHAT_STORAGE_KEY, GLOBAL_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const getOverlayFontSize = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe.ytd-live-chat-frame') as HTMLIFrameElement | null
  const doc = iframe?.contentDocument ?? null
  if (!doc) return null
  return doc.documentElement.style.getPropertyValue('--extension-yt-live-chat-font-size')
}

const getOverlayCSSProperties = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe.ytd-live-chat-frame') as HTMLIFrameElement | null
  const doc = iframe?.contentDocument ?? null
  if (!doc) return null
  const style = doc.documentElement.style
  return {
    fontSize: style.getPropertyValue('--extension-yt-live-chat-font-size'),
    spacing: style.getPropertyValue('--extension-yt-live-chat-spacing'),
    userNameDisplay: style.getPropertyValue('--extension-user-name-display'),
    userIconDisplay: style.getPropertyValue('--extension-user-icon-display'),
    superChatBarDisplay: style.getPropertyValue('--extension-super-chat-bar-display'),
  }
}

const isExtensionChatWithMessages = () => {
  const iframe = window.__ylcHelpers.getExtensionIframe()
  const doc = iframe?.contentDocument ?? null
  if (!doc) return false
  return doc.querySelectorAll('yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer').length > 0
}

type StoredCustomPreset = {
  kind: 'custom'
  id: string
  name: string
  profile: {
    appearance: {
      fontSize: number
    }
  }
}

const getStoredCustomPresets = (state: Record<string, unknown> | undefined) =>
  (Array.isArray(state?.presets) ? state.presets : []).filter(
    (preset): preset is StoredCustomPreset =>
      typeof preset === 'object' && preset !== null && (preset as { kind?: unknown }).kind === 'custom',
  )

test.describe('imported settings fullscreen', { tag: '@live' }, () => {
  test('imported settings are applied in fullscreen chat', async ({ page, extension, liveUrl }) => {
    test.setTimeout(180000)

    await importSettingsViaPopup(page, extension, {
      version: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      globalSetting: { ytdLiveChat: true, themeMode: 'dark' },
      ytdLiveChat: { fontSize: 42 },
    })

    await expect
      .poll(async () => {
        const state = (await readStorageEntry(extension, CHAT_STORAGE_KEY))?.value
        const profile = state?.profile as { appearance?: { fontSize?: number } } | undefined
        return profile?.appearance?.fontSize ?? null
      })
      .toBe(40)

    if (!liveUrl) {
      test.skip(true, 'No live URL with chat found.')
      return
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)
    await page.goto(liveUrl, { waitUntil: 'domcontentloaded' })

    const nativeChatReady = await hasCanaryPrecondition(() => yt.expectNativeChat())
    if (!nativeChatReady) {
      test.skip(true, 'Live URL did not expose native chat frame in time.')
      return
    }
    await yt.enterFullscreen()

    const switchReady = await hasCanaryPrecondition(() => overlay.expectSwitchReady())
    if (!switchReady) {
      test.skip(true, 'Fullscreen chat switch button did not appear.')
      return
    }

    await overlay.toggleOn()

    const loaded = await hasCanaryPrecondition(() => overlay.expectChatLoaded())
    if (!loaded) {
      test.skip(true, 'Extension iframe did not load in time.')
      return
    }

    try {
      await expect.poll(async () => page.evaluate(isExtensionChatWithMessages), { timeout: 20000 }).toBe(true)
    } catch {
      test.skip(true, 'Extension iframe loaded but no chat messages appeared.')
      return
    }

    await expect
      .poll(
        async () => {
          const value = await page.evaluate(getOverlayFontSize)
          return value ?? ''
        },
        { timeout: 15000 },
      )
      .toBe('40px')
  })

  test('settings imported while chat is active are applied without reload', async ({ context, page, extension, liveUrl }) => {
    test.setTimeout(180000)

    if (!liveUrl) {
      test.skip(true, 'No live URL with chat found.')
      return
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)
    await page.goto(liveUrl, { waitUntil: 'domcontentloaded' })

    const nativeChatReady = await hasCanaryPrecondition(() => yt.expectNativeChat())
    if (!nativeChatReady) {
      test.skip(true, 'Live URL did not expose native chat frame in time.')
      return
    }
    await yt.enterFullscreen()

    const switchReady = await hasCanaryPrecondition(() => overlay.expectSwitchReady())
    if (!switchReady) {
      test.skip(true, 'Fullscreen chat switch button did not appear.')
      return
    }

    await overlay.toggleOn()

    const loaded = await hasCanaryPrecondition(() => overlay.expectChatLoaded())
    if (!loaded) {
      test.skip(true, 'Extension iframe did not load in time.')
      return
    }

    try {
      await expect.poll(async () => page.evaluate(isExtensionChatWithMessages), { timeout: 20000 }).toBe(true)
    } catch {
      test.skip(true, 'Extension iframe loaded but no chat messages appeared.')
      return
    }

    // Verify initial CSS — fontSize should be set but NOT be the value we will import (30px).
    // We avoid asserting the exact default ('13px') because the service worker's in-memory runtime state
    // may have written back a stale value from a previous test despite fixture double-clear.
    await expect
      .poll(
        async () => {
          const props = await page.evaluate(getOverlayCSSProperties)
          return props?.fontSize ?? ''
        },
        { timeout: 15000 },
      )
      .not.toBe('30px')

    // Import settings with multiple style changes + custom presets via popup in a separate tab.
    // Bring YouTube tab to front first so chrome.tabs.query({ active: true })
    // returns the YouTube tab -- matching real popup behaviour.
    const popupPage = await context.newPage()
    await page.bringToFront()

    await importSettingsViaPopup(popupPage, extension, {
      version: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      globalSetting: { ytdLiveChat: true, themeMode: 'dark' },
      ytdLiveChat: {
        fontSize: 30,
        space: 10,
        userNameDisplay: false,
        userIconDisplay: false,
        superChatBarDisplay: false,
        presetItemIds: ['imported1', 'imported2'],
        presetItemStyles: {
          imported1: {
            bgColor: { r: 0, g: 0, b: 0, a: 1 },
            fontColor: { r: 255, g: 255, b: 255, a: 1 },
            fontFamily: '',
            fontSize: 20,
            blur: 0,
            space: 0,
            alwaysOnDisplay: true,
            chatOnlyDisplay: false,
            userNameDisplay: true,
            userIconDisplay: true,
            superChatBarDisplay: true,
          },
          imported2: {
            bgColor: { r: 255, g: 255, b: 255, a: 0.5 },
            fontColor: { r: 0, g: 0, b: 0, a: 1 },
            fontFamily: 'Zen Maru Gothic',
            fontSize: 16,
            blur: 10,
            space: 5,
            alwaysOnDisplay: true,
            chatOnlyDisplay: true,
            userNameDisplay: false,
            userIconDisplay: true,
            superChatBarDisplay: false,
          },
        },
        presetItemTitles: {
          imported1: 'Dark Preset',
          imported2: 'Semi-transparent',
        },
      },
    })

    // Verify multiple CSS variables are dynamically updated without page reload
    await expect
      .poll(
        async () => {
          const props = await page.evaluate(getOverlayCSSProperties)
          if (!props) return null
          return {
            fontSize: props.fontSize,
            spacing: props.spacing,
            userNameDisplay: props.userNameDisplay,
            userIconDisplay: props.userIconDisplay,
            superChatBarDisplay: props.superChatBarDisplay,
          }
        },
        { timeout: 15000 },
      )
      .toEqual({
        fontSize: '30px',
        spacing: '10px',
        userNameDisplay: 'none',
        userIconDisplay: 'none',
        superChatBarDisplay: 'none',
      })

    // Verify preset data was persisted to storage (read from extension storage directly)
    const ytdState = await readStorageEntry(popupPage, CHAT_STORAGE_KEY)
    const importedPresets = getStoredCustomPresets(ytdState?.value)
    expect(importedPresets.map(preset => preset.id)).toEqual(['imported1', 'imported2'])
    expect(importedPresets[0]?.profile.appearance.fontSize).toBe(20)
    expect(importedPresets[1]?.profile.appearance.fontSize).toBe(16)
    expect(importedPresets[0]?.name).toBe('Dark Preset')
    expect(importedPresets[1]?.name).toBe('Semi-transparent')

    await popupPage.close()
  })

  test('sequential imports each overwrite previous settings and presets', async ({ context, page, extension, liveUrl }) => {
    test.setTimeout(180000)

    if (!liveUrl) {
      test.skip(true, 'No live URL with chat found.')
      return
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)
    await page.goto(liveUrl, { waitUntil: 'domcontentloaded' })

    const nativeChatReady = await hasCanaryPrecondition(() => yt.expectNativeChat())
    if (!nativeChatReady) {
      test.skip(true, 'Live URL did not expose native chat frame in time.')
      return
    }
    await yt.enterFullscreen()

    const switchReady = await hasCanaryPrecondition(() => overlay.expectSwitchReady())
    if (!switchReady) {
      test.skip(true, 'Fullscreen chat switch button did not appear.')
      return
    }

    await overlay.toggleOn()

    const loaded = await hasCanaryPrecondition(() => overlay.expectChatLoaded())
    if (!loaded) {
      test.skip(true, 'Extension iframe did not load in time.')
      return
    }

    try {
      await expect.poll(async () => page.evaluate(isExtensionChatWithMessages), { timeout: 20000 }).toBe(true)
    } catch {
      test.skip(true, 'Extension iframe loaded but no chat messages appeared.')
      return
    }

    const popupPage = await context.newPage()
    await page.bringToFront()

    // -- First import: large font, hidden elements, preset "dark1" --
    await importSettingsViaPopup(popupPage, extension, {
      version: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      globalSetting: { ytdLiveChat: true, themeMode: 'dark' },
      ytdLiveChat: {
        fontSize: 42,
        space: 15,
        userNameDisplay: false,
        userIconDisplay: false,
        superChatBarDisplay: false,
        presetItemIds: ['dark1'],
        presetItemStyles: {
          dark1: {
            bgColor: { r: 0, g: 0, b: 0, a: 1 },
            fontColor: { r: 255, g: 255, b: 255, a: 1 },
            fontFamily: '',
            fontSize: 20,
            blur: 0,
            space: 0,
            alwaysOnDisplay: true,
            chatOnlyDisplay: false,
            userNameDisplay: true,
            userIconDisplay: true,
            superChatBarDisplay: true,
          },
        },
        presetItemTitles: { dark1: 'Dark Mode' },
      },
    })

    // Verify CSS reflects the first import
    await expect
      .poll(
        async () => {
          const props = await page.evaluate(getOverlayCSSProperties)
          if (!props) return null
          return { fontSize: props.fontSize, spacing: props.spacing, userNameDisplay: props.userNameDisplay }
        },
        { timeout: 15000 },
      )
      .toEqual({ fontSize: '40px', spacing: '15px', userNameDisplay: 'none' })

    // Verify first import's presets are stored (read from popupPage to avoid temporary popup pages)
    const stateAfterFirst = await readStorageEntry(popupPage, CHAT_STORAGE_KEY)
    expect(getStoredCustomPresets(stateAfterFirst?.value).map(preset => preset.id)).toEqual(['dark1'])

    // -- Second import: small font, all visible, presets "light1"+"light2" --
    await importSettingsViaPopup(popupPage, extension, {
      version: 1,
      exportedAt: '2024-02-01T00:00:00.000Z',
      globalSetting: { ytdLiveChat: true, themeMode: 'light' },
      ytdLiveChat: {
        fontSize: 18,
        space: 5,
        userNameDisplay: true,
        userIconDisplay: true,
        superChatBarDisplay: true,
        presetItemIds: ['light1', 'light2'],
        presetItemStyles: {
          light1: {
            bgColor: { r: 255, g: 255, b: 255, a: 1 },
            fontColor: { r: 0, g: 0, b: 0, a: 1 },
            fontFamily: '',
            fontSize: 14,
            blur: 0,
            space: 0,
            alwaysOnDisplay: true,
            chatOnlyDisplay: false,
            userNameDisplay: true,
            userIconDisplay: true,
            superChatBarDisplay: true,
          },
          light2: {
            bgColor: { r: 240, g: 240, b: 240, a: 0.8 },
            fontColor: { r: 30, g: 30, b: 30, a: 1 },
            fontFamily: 'Zen Maru Gothic',
            fontSize: 24,
            blur: 5,
            space: 10,
            alwaysOnDisplay: true,
            chatOnlyDisplay: true,
            userNameDisplay: false,
            userIconDisplay: true,
            superChatBarDisplay: false,
          },
        },
        presetItemTitles: { light1: 'Light', light2: 'Large Light' },
      },
    })

    // Verify CSS is fully overwritten by the second import
    await expect
      .poll(
        async () => {
          const props = await page.evaluate(getOverlayCSSProperties)
          if (!props) return null
          return {
            fontSize: props.fontSize,
            spacing: props.spacing,
            userNameDisplay: props.userNameDisplay,
            userIconDisplay: props.userIconDisplay,
            superChatBarDisplay: props.superChatBarDisplay,
          }
        },
        { timeout: 15000 },
      )
      .toEqual({
        fontSize: '18px',
        spacing: '5px',
        userNameDisplay: 'inline',
        userIconDisplay: 'inline',
        superChatBarDisplay: 'block',
      })

    // Verify presets are fully replaced -- "dark1" from the first import must not remain
    const stateAfterSecond = await readStorageEntry(popupPage, CHAT_STORAGE_KEY)
    const secondPresets = getStoredCustomPresets(stateAfterSecond?.value)
    expect(secondPresets.map(preset => preset.id)).toEqual(['light1', 'light2'])
    expect(secondPresets.some(preset => preset.id === 'dark1')).toBe(false)
    expect(secondPresets[0]?.profile.appearance.fontSize).toBe(14)
    expect(secondPresets[1]?.profile.appearance.fontSize).toBe(24)
    expect(secondPresets[0]?.name).toBe('Light')
    expect(secondPresets[1]?.name).toBe('Large Light')

    // Verify globalSetting was also overwritten by the second import
    const globalState = await readStorageEntry(popupPage, GLOBAL_STORAGE_KEY)
    expect(globalState?.value.themeMode).toBe('light')

    await popupPage.close()
  })
})
