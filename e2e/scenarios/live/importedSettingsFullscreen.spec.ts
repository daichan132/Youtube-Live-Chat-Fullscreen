import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { importSettingsViaPopup, readStorageEntry } from '@e2e/utils/popupHelpers'

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

test.describe('imported settings fullscreen', { tag: '@live' }, () => {
  test('imported settings are applied in fullscreen chat', async ({ page, extension, liveUrl }) => {
    test.setTimeout(180000)

    await importSettingsViaPopup(page, extension, {
      version: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      globalSetting: { ytdLiveChat: true, themeMode: 'dark' },
      ytdLiveChat: { fontSize: 42 },
    })

    await expect.poll(async () => (await readStorageEntry(extension, 'ytdLiveChatStore'))?.state.fontSize ?? null).toBe(42)

    if (!liveUrl) {
      test.skip(true, 'No live URL with chat found.')
      return
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)
    await page.goto(liveUrl, { waitUntil: 'domcontentloaded' })

    await yt.waitForNativeChat()
    await yt.enterFullscreen()

    const switchReady = await overlay.waitForSwitchReady()
    if (!switchReady) {
      test.skip(true, 'Fullscreen chat switch button did not appear.')
      return
    }

    await overlay.toggleOn()

    const loaded = await overlay.waitForChatLoaded()
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
      .toBe('42px')
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

    await yt.waitForNativeChat()
    await yt.enterFullscreen()

    const switchReady = await overlay.waitForSwitchReady()
    if (!switchReady) {
      test.skip(true, 'Fullscreen chat switch button did not appear.')
      return
    }

    await overlay.toggleOn()

    const loaded = await overlay.waitForChatLoaded()
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
    // We avoid asserting the exact default ('13px') because the SW's in-memory Zustand store
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
    const ytdState = await readStorageEntry(popupPage, 'ytdLiveChatStore')
    expect(ytdState?.state.presetItemIds).toEqual(['imported1', 'imported2'])
    expect((ytdState?.state.presetItemStyles as Record<string, Record<string, unknown>>)?.imported1?.fontSize).toBe(20)
    expect((ytdState?.state.presetItemStyles as Record<string, Record<string, unknown>>)?.imported2?.fontSize).toBe(16)
    expect((ytdState?.state.presetItemTitles as Record<string, string>)?.imported1).toBe('Dark Preset')
    expect((ytdState?.state.presetItemTitles as Record<string, string>)?.imported2).toBe('Semi-transparent')

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

    await yt.waitForNativeChat()
    await yt.enterFullscreen()

    const switchReady = await overlay.waitForSwitchReady()
    if (!switchReady) {
      test.skip(true, 'Fullscreen chat switch button did not appear.')
      return
    }

    await overlay.toggleOn()

    const loaded = await overlay.waitForChatLoaded()
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
      .toEqual({ fontSize: '42px', spacing: '15px', userNameDisplay: 'none' })

    // Verify first import's presets are stored (read from popupPage to avoid temporary popup pages)
    const stateAfterFirst = await readStorageEntry(popupPage, 'ytdLiveChatStore')
    expect(stateAfterFirst?.state.presetItemIds).toEqual(['dark1'])

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
    const stateAfterSecond = await readStorageEntry(popupPage, 'ytdLiveChatStore')
    expect(stateAfterSecond?.state.presetItemIds).toEqual(['light1', 'light2'])
    expect(stateAfterSecond?.state.presetItemStyles).not.toHaveProperty('dark1')
    expect(stateAfterSecond?.state.presetItemTitles).not.toHaveProperty('dark1')
    expect((stateAfterSecond?.state.presetItemStyles as Record<string, Record<string, unknown>>)?.light1?.fontSize).toBe(14)
    expect((stateAfterSecond?.state.presetItemStyles as Record<string, Record<string, unknown>>)?.light2?.fontSize).toBe(24)
    expect((stateAfterSecond?.state.presetItemTitles as Record<string, string>)?.light1).toBe('Light')
    expect((stateAfterSecond?.state.presetItemTitles as Record<string, string>)?.light2).toBe('Large Light')

    // Verify globalSetting was also overwritten by the second import
    const globalState = await readStorageEntry(popupPage, 'globalSettingStore')
    expect(globalState?.state.themeMode).toBe('light')

    await popupPage.close()
  })
})
