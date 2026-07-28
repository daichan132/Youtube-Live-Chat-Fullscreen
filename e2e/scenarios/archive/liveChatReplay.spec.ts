import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { captureChatState, openArchiveWatchPage } from '@e2e/support/diagnostics'
import { meetsExternalYouTubePrecondition } from '@e2e/support/externalYouTubePreconditions'

const isExtensionArchiveIframeBorrowed = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return false
  return iframe.getAttribute('data-ylc-owned') !== 'true'
}

test.describe('archive replay chat', { tag: '@archive' }, () => {
  test('youtube archive replay chat works in fullscreen', async ({ page, archiveReplayUrl }) => {
    test.setTimeout(150000)

    if (!archiveReplayUrl) {
      await captureChatState(page, test.info(), 'archive-replay-url-selection-failed')
      test.skip(true, 'No archive replay URL satisfied preconditions.')
      return
    }

    const archiveReady = await openArchiveWatchPage(page, archiveReplayUrl, { maxDurationMs: 30000 })
    if (!archiveReady) {
      await captureChatState(page, test.info(), 'archive-replay-precondition-missing')
      test.skip(true, 'Selected archive URL did not expose archive chat container in time.')
      return
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)

    const fullscreenReady = await meetsExternalYouTubePrecondition('fullscreen-ui', () => yt.enterFullscreen())
    if (!fullscreenReady) {
      await captureChatState(page, test.info(), 'archive-replay-fullscreen-precondition-missing')
      test.skip(true, 'YouTube fullscreen UI did not meet the canary precondition.')
      return
    }

    await overlay.expectSwitchReady()
    await overlay.toggleOn()
    await overlay.expectArchiveChatPlayable()
    await expect.poll(async () => page.evaluate(isExtensionArchiveIframeBorrowed), { timeout: 10000 }).toBe(true)
  })
})
