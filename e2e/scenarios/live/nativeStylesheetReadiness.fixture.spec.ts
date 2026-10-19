import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'

for (const mode of ['live', 'archive'] as const) {
  test(
    `waits for native CSS and retains the ${mode} document through stylesheet recovery`,
    { tag: ['@fixture', `@${mode}`] },
    async ({ page }, testInfo) => {
      const video = { id: `ylc-native-css-${mode}`, title: 'Native stylesheet readiness', mode }
      const native = { state: 'playable' as const, continuationVideoId: video.id, baseStylesheet: true }
      const state: YouTubeScenarioState =
        mode === 'live'
          ? {
              video: { ...video, mode },
              page: { chatContainer: 'present' },
              fullscreen: false,
              chat: { mode, native, response: 'playable', purchaseInteractions: true },
            }
          : {
              video: { ...video, mode },
              page: { chatContainer: 'present' },
              fullscreen: false,
              chat: { mode, native, response: 'playable' },
            }
      let requests = 0
      let release!: () => void
      const held = new Promise<void>(resolve => {
        release = resolve
      })
      await page.route('**/ylc-fixture-native-base.css', async route => {
        requests++
        if (requests > 1) await held
        await route.fulfill({ contentType: 'text/css', body: requests === 1 ? '' : 'body { --fixture-native-base-ready: yes; }' })
      })
      const scenario = new YouTubeScenario(page)
      const overlay = new ExtensionOverlay(page)
      try {
        await scenario.load(state)
        await expect.poll(() => requests).toBe(1)
        await page.waitForLoadState('load')
        await scenario.enterFullscreen()
        await expect(page.locator('[data-ylc-loading-overlay]')).toBeVisible()
        await expect(page.locator('[data-ylc-chat-viewport]')).toHaveCSS('opacity', '0')
        await expect.poll(() => requests).toBe(2)
        await testInfo.attach('native-css-pending', { body: await page.screenshot(), contentType: 'image/png' })
        const chat = page.frameLocator('iframe[data-ylc-chat]')
        await chat.locator('body').evaluate(body => {
          const doc = body.ownerDocument
          if (!doc.defaultView) throw new Error('Missing chat window')
          Object.assign(doc.defaultView, {
            __fixtureRetainedDocument: doc,
            __fixtureRetainedRuntime: doc.defaultView,
          })
        })
        release()
        await expect(page.locator('[data-ylc-loading-overlay]')).toHaveCount(0)
        await expect(page.locator('[data-ylc-chat-viewport]')).toHaveCSS('opacity', '1')
        await overlay.expectChatLoaded()
        await testInfo.attach('native-css-ready', { body: await page.screenshot(), contentType: 'image/png' })
        expect(
          await chat.locator('body').evaluate(body => {
            const doc = body.ownerDocument
            const w = doc.defaultView as Window & {
              __fixtureRetainedDocument?: Document
              __fixtureRetainedRuntime?: unknown
            }
            return doc === w.__fixtureRetainedDocument && w === w.__fixtureRetainedRuntime
          }),
        ).toBe(true)
        if (mode === 'live') {
          await chat.getByRole('button', { name: 'Open support menu', exact: true }).click()
          await chat.getByRole('button', { name: 'Open Super Chat', exact: true }).click()
          await chat.getByRole('button', { name: 'Close Super Chat', exact: true }).click()
          expect(await chat.locator('[contenteditable]').textContent()).toBe('Unsent chat draft')
          expect(
            await chat.locator('body').evaluate(
              body =>
                (
                  body.ownerDocument.defaultView as unknown as Window & {
                    __ylcFixturePurchase: { confirmations: number; preventedEntries: number }
                  }
                ).__ylcFixturePurchase,
            ),
          ).toMatchObject({ confirmations: 0, preventedEntries: 0 })
        }
        await scenario.exitFullscreen()
        await overlay.expectOverlayRemoved()
        await expect
          .poll(() =>
            page
              .frameLocator('#chatframe')
              .locator('#base-css')
              .evaluate(link => (link as HTMLLinkElement).sheet?.cssRules.length ?? 0),
          )
          .toBeGreaterThan(0)
      } finally {
        release()
      }
    },
  )
}
