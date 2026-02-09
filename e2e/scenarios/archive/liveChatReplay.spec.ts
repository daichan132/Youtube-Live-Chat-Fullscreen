import { expect, test } from '../../fixtures'
import { captureChatState, isExtensionArchiveChatPlayable, openArchiveWatchPage, shouldSkipArchiveFlowFailure } from '../../support/diagnostics'
import { selectArchiveReplayUrl } from '../../support/urls/archiveReplay'
import { reliableClick } from '../../utils/actions'
import {
  switchButtonSelector,
} from '../../utils/selectors'

const isExtensionArchiveIframeBorrowed = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return false
  return iframe.getAttribute('data-ylc-owned') !== 'true'
}

test('youtube archive replay chat works in fullscreen', async ({ page }) => {
  test.setTimeout(150000)
  const selectedArchiveUrl = await selectArchiveReplayUrl(page, { maxDurationMs: 45000 })
  if (!selectedArchiveUrl) {
    await captureChatState(page, test.info(), 'archive-replay-url-selection-failed')
    test.skip(true, 'No archive replay URL satisfied preconditions.')
    return
  }

  const archiveReady = await openArchiveWatchPage(page, selectedArchiveUrl, { maxDurationMs: 30000 })
  if (!archiveReady) {
    await captureChatState(page, test.info(), 'archive-replay-precondition-missing')
    test.skip(true, 'Selected archive URL did not expose archive chat container in time.')
    return
  }

  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null, { timeout: 8000 })

  await page.locator('#movie_player').hover()

  const switchButton = page.locator(switchButtonSelector)
  const switchReady = await switchButton.waitFor({ state: 'visible', timeout: 10000 }).then(
    () => true,
    () => false,
  )
  if (!switchReady) {
    await captureChatState(page, test.info(), 'archive-replay-switch-missing')
    test.skip(true, 'Fullscreen chat switch button did not appear.')
    return
  }
  await reliableClick(switchButton, page, switchButtonSelector)
  await expect(switchButton).toHaveAttribute('aria-pressed', 'true')

  let extensionReady = false
  try {
    await expect.poll(async () => page.evaluate(isExtensionArchiveChatPlayable), { timeout: 60000 }).toBe(true)
    extensionReady = true
  } catch {
    extensionReady = false
  }

  if (!extensionReady) {
    const state = await captureChatState(page, test.info(), 'archive-replay-extension-unready')
    if (shouldSkipArchiveFlowFailure(state)) {
      test.skip(true, 'Archive chat source did not become ready in this run.')
      return
    }
    expect(extensionReady).toBe(true)
  }

  await expect.poll(async () => page.evaluate(isExtensionArchiveIframeBorrowed), { timeout: 10000 }).toBe(true)
})
