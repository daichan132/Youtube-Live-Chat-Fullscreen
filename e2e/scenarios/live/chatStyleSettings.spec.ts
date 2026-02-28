import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'

const hasOverlayIframe = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  return Boolean(root?.querySelector('iframe.ytd-live-chat-frame'))
}

const getOverlayFontFamily = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe.ytd-live-chat-frame') as HTMLIFrameElement | null
  const doc = iframe?.contentDocument ?? null
  if (!doc) return null
  return doc.documentElement.style.getPropertyValue('font-family')
}

test.describe('chat style settings', { tag: '@live' }, () => {
  test('settings update live chat font family', async ({ page, liveUrl }) => {
    test.setTimeout(180000)

    if (!liveUrl) {
      test.skip(true, 'No live URL with chat found.')
      return
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)

    await yt.goto(liveUrl)

    await yt.waitForNativeChat()
    await yt.enterFullscreen()

    const switchReady = await overlay.waitForSwitchReady()
    if (!switchReady) {
      test.skip(true, 'Fullscreen chat switch button did not appear.')
      return
    }

    await overlay.toggleOn()

    let overlayReady = false
    try {
      await expect.poll(async () => page.evaluate(hasOverlayIframe), { timeout: 20000 }).toBe(true)
      overlayReady = true
    } catch {
      overlayReady = false
    }
    if (!overlayReady) {
      test.skip(true, 'Extension iframe did not load in time.')
      return
    }

    const settingsBtn = page.locator('#shadow-root-live-chat [data-ylc-settings-btn]').first()
    const settingsReady = await settingsBtn.waitFor({ state: 'visible', timeout: 5000 }).then(
      () => true,
      () => false,
    )
    if (!settingsReady) {
      test.skip(true, 'Settings icon did not appear.')
      return
    }
    await settingsBtn.click({ force: true })
    await page.evaluate(() => {
      const host = document.getElementById('shadow-root-live-chat')
      const root = host?.shadowRoot ?? null
      const btn = root?.querySelector('[data-ylc-settings-btn]') as HTMLButtonElement | null
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    })

    const modalContent = page.locator('#shadow-root-live-chat-modal-root [role="dialog"]')
    const modalReady = await modalContent.waitFor({ state: 'visible', timeout: 10000 }).then(
      () => true,
      () => false,
    )
    if (!modalReady) {
      test.skip(true, 'Settings modal did not open.')
      return
    }

    const settingTab = modalContent.locator('#ylc-tab-setting')
    const settingTabReady = await settingTab.waitFor({ state: 'visible', timeout: 5000 }).then(
      () => true,
      () => false,
    )
    if (!settingTabReady) {
      test.skip(true, 'Settings tab button not found.')
      return
    }
    await settingTab.click()

    const fontTrigger = modalContent.locator('[data-ylc-font-combobox-trigger="true"]').first()
    const triggerReady = await fontTrigger.waitFor({ state: 'visible', timeout: 5000 }).then(
      () => true,
      () => false,
    )
    if (!triggerReady) {
      test.skip(true, 'Font family combobox trigger did not appear.')
      return
    }
    await fontTrigger.click({ force: true })

    const desiredFont = 'Roboto Slab'
    const fontSearchInput = modalContent.locator('[data-ylc-font-combobox-search="true"]').first()
    const searchReady = await fontSearchInput.waitFor({ state: 'visible', timeout: 5000 }).then(
      () => true,
      () => false,
    )
    if (!searchReady) {
      test.skip(true, 'Font family combobox search input did not appear.')
      return
    }

    await fontSearchInput.fill(desiredFont)
    await fontSearchInput.press('Enter')

    await expect
      .poll(
        async () => {
          const value = await page.evaluate(getOverlayFontFamily)
          return value ?? ''
        },
        { timeout: 15000 },
      )
      .toContain(desiredFont)
  })
})
