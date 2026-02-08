import { expect, test } from '../../fixtures'
import { captureChatState, isExtensionArchiveChatPlayable, openArchiveWatchPage, shouldSkipArchiveFlowFailure } from '../../support/diagnostics'
import { selectArchiveReplayUrl } from '../../support/urls/archiveReplay'
import { reliableClick } from '../../utils/actions'
import {
  switchButtonSelector,
} from '../../utils/selectors'

const isNativeChatUsable = () => {
  const secondary = document.querySelector('#secondary') as HTMLElement | null
  const chatContainer = document.querySelector('#chat-container') as HTMLElement | null
  const chatFrameHost = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
  const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
  if (!secondary || !chatContainer || !chatFrameHost || !chatFrame) return false

  const secondaryStyle = window.getComputedStyle(secondary)
  const containerStyle = window.getComputedStyle(chatContainer)
  const hostStyle = window.getComputedStyle(chatFrameHost)
  const isHidden =
    secondaryStyle.display === 'none' ||
    secondaryStyle.visibility === 'hidden' ||
    containerStyle.display === 'none' ||
    containerStyle.visibility === 'hidden' ||
    hostStyle.display === 'none' ||
    hostStyle.visibility === 'hidden'
  if (isHidden) return false

  const pointerBlocked =
    secondaryStyle.pointerEvents === 'none' ||
    containerStyle.pointerEvents === 'none' ||
    hostStyle.pointerEvents === 'none'
  if (pointerBlocked) return false

  const secondaryBox = secondary.getBoundingClientRect()
  const chatBox = chatFrameHost.getBoundingClientRect()
  const frameBox = chatFrame.getBoundingClientRect()
  return secondaryBox.width > 80 && chatBox.width > 80 && chatBox.height > 120 && frameBox.height > 120
}

const getNativeChatDebugState = () => {
  const secondary = document.querySelector('#secondary') as HTMLElement | null
  const chatContainer = document.querySelector('#chat-container') as HTMLElement | null
  const chatFrameHost = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
  const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
  const secondaryStyle = secondary ? window.getComputedStyle(secondary) : null
  const containerStyle = chatContainer ? window.getComputedStyle(chatContainer) : null
  const hostStyle = chatFrameHost ? window.getComputedStyle(chatFrameHost) : null
  return {
    fullscreen: document.fullscreenElement !== null,
    hasSecondary: Boolean(secondary),
    hasContainer: Boolean(chatContainer),
    hasHost: Boolean(chatFrameHost),
    hasFrame: Boolean(chatFrame),
    secondaryDisplay: secondaryStyle?.display ?? '',
    secondaryVisibility: secondaryStyle?.visibility ?? '',
    secondaryPointerEvents: secondaryStyle?.pointerEvents ?? '',
    containerDisplay: containerStyle?.display ?? '',
    containerVisibility: containerStyle?.visibility ?? '',
    containerPointerEvents: containerStyle?.pointerEvents ?? '',
    hostDisplay: hostStyle?.display ?? '',
    hostVisibility: hostStyle?.visibility ?? '',
    hostPointerEvents: hostStyle?.pointerEvents ?? '',
    secondaryWidth: secondary?.getBoundingClientRect().width ?? 0,
    hostWidth: chatFrameHost?.getBoundingClientRect().width ?? 0,
    hostHeight: chatFrameHost?.getBoundingClientRect().height ?? 0,
    frameHeight: chatFrame?.getBoundingClientRect().height ?? 0,
  }
}

test('restore native chat after archive fullscreen chat closes', async ({ page }) => {
  test.setTimeout(150000)

  const selectedArchiveUrl = await selectArchiveReplayUrl(page, { maxDurationMs: 45000 })
  if (!selectedArchiveUrl) {
    await captureChatState(page, test.info(), 'restore-archive-url-selection-failed')
    test.skip(true, 'No archive replay URL satisfied preconditions.')
    return
  }

  const archiveReady = await openArchiveWatchPage(page, selectedArchiveUrl, { maxDurationMs: 30000 })
  if (!archiveReady) {
    await captureChatState(page, test.info(), 'restore-archive-precondition-missing')
    test.skip(true, 'Selected archive URL did not expose archive chat container in time.')
    return
  }

  await page.locator('#movie_player').hover()
  const switchButton = page.locator(switchButtonSelector)
  const switchReady = await switchButton.waitFor({ state: 'visible', timeout: 10000 }).then(
    () => true,
    () => false,
  )
  if (!switchReady) {
    await captureChatState(page, test.info(), 'restore-switch-missing')
    test.skip(true, 'Fullscreen chat switch button did not appear.')
    return
  }
  await reliableClick(switchButton, page, switchButtonSelector)
  await expect(switchButton).toHaveAttribute('aria-pressed', 'true')
  let extensionReady = false
  try {
    await expect.poll(async () => page.evaluate(isExtensionArchiveChatPlayable), { timeout: 45000 }).toBe(true)
    extensionReady = true
  } catch {
    extensionReady = false
  }
  if (!extensionReady) {
    const state = await captureChatState(page, test.info(), 'restore-extension-unready')
    if (shouldSkipArchiveFlowFailure(state)) {
      test.skip(true, 'Archive chat source did not become ready in this run.')
      return
    }
    expect(extensionReady).toBe(true)
  }

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await expect.poll(async () => page.evaluate(() => document.fullscreenElement === null), { timeout: 8000 }).toBe(true)
  try {
    await expect.poll(async () => page.evaluate(isNativeChatUsable), { timeout: 12000 }).toBe(true)
  } catch (error) {
    const nativeDebugState = await page.evaluate(getNativeChatDebugState)
    // eslint-disable-next-line no-console
    console.log('[fullscreenChatRestore][native-debug]', nativeDebugState)
    throw error
  }
})
