import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { setRangeWithKeyboard } from '@e2e/utils/rangeInput'
import { patchOverlayStore } from '@e2e/utils/storageHelper'

for (const mode of ['live', 'archive'] as const) {
  test(
    `applies slider text size to visible ${mode} text and restores native typography`,
    { tag: '@fixture' },
    async ({ page, extension }, testInfo) => {
      const scenario = new YouTubeScenario(page)
      const overlay = new ExtensionOverlay(page)
      const state = {
        video: { id: `font-size-${mode}`, title: 'Text size fixture', mode },
        page: { chatContainer: 'present', chatDimensions: 'standard' },
        fullscreen: false,
        chat: { mode, native: { state: 'playable' }, response: 'playable' },
      } as YouTubeScenarioState
      await patchOverlayStore(extension, {
        profile: { appearance: { fontSize: 13 }, display: { idleVisibility: 'always-visible', contentMode: 'full-chat' } },
      })
      await scenario.load(state)
      await scenario.enterFullscreen()
      await overlay.expectChatLoaded({ timeout: 12000 })
      await overlay.installChatTypographyProbe()
      const chat = page.frameLocator('iframe[data-ylc-chat]')
      const message = chat.locator('[data-ylc-preview-message]')
      const expectSize = async (size: number) => {
        await expect
          .poll(() => overlay.getChatTypographyState())
          .toMatchObject({
            renderedFontSize: `${size}px`,
            authorFontSize: `${size}px`,
            timestampFontSize: `${size}px`,
            linkFontSize: `${size}px`,
          })
      }
      await expectSize(13)
      const smallScreenshot = testInfo.outputPath(`${mode}-text-13px.png`)
      await message.screenshot({ path: smallScreenshot })
      await testInfo.attach(`${mode}-text-13px`, { path: smallScreenshot, contentType: 'image/png' })
      await overlay.openSettings()
      const settings = overlay.settingsFrame()
      const input = settings.getByRole('slider', { name: 'Text Size', exact: true })
      await setRangeWithKeyboard(input, 28)
      await expectSize(28)
      await settings.getByRole('button', { name: 'Undo style change', exact: true }).click()
      await expectSize(13)
      await settings.getByRole('button', { name: 'Redo style change', exact: true }).click()
      await expectSize(28)
      for (const size of [10, 40, 28]) {
        await setRangeWithKeyboard(input, size)
        await expectSize(size)
      }
      await settings.getByRole('button', { name: 'Close', exact: true }).click()
      const largeScreenshot = testInfo.outputPath(`${mode}-text-28px.png`)
      await message.screenshot({ path: largeScreenshot })
      await testInfo.attach(`${mode}-text-28px`, { path: largeScreenshot, contentType: 'image/png' })

      // The typed fixture serves each watch document once; load a fresh one to
      // verify persisted appearance after content/settings sessions are recreated.
      await scenario.load(state)
      await scenario.enterFullscreen()
      await overlay.expectChatLoaded({ timeout: 12000 })
      await overlay.installChatTypographyProbe()
      await expectSize(28)
      await scenario.exitFullscreen()
      await overlay.expectChatDetached({ timeout: 12000 })
      const native = page.frameLocator('iframe#chatframe').locator('[data-ylc-preview-message]')
      await expect(native.locator('#message')).toHaveCSS('font-size', '13px')
      await expect(native.locator('#author-name')).toHaveCSS('font-size', '13px')
      await expect(native.locator('#timestamp')).toHaveCSS('font-size', '11px')
      await expect(native.locator('#message')).toHaveCSS('line-height', '20px')
    },
  )
}
