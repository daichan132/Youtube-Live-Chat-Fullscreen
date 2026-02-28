import type { Page } from '@playwright/test'

/**
 * Try to close the native chat panel via UI controls.
 * Returns `true` if a close/hide button was found and clicked,
 * `false` if no suitable button was found.
 */
export const closeNativeChat = async (page: Page): Promise<boolean> => {
	const outerSelectors = [
		'ytd-live-chat-frame #show-hide-button button',
		'ytd-live-chat-frame #show-hide-button yt-icon-button',
		'ytd-live-chat-frame #close-button button',
		'ytd-live-chat-frame #close-button yt-icon-button',
		'ytd-live-chat-frame button[aria-label="Close"]',
		'ytd-live-chat-frame button[title="Close"]',
	]

	for (const selector of outerSelectors) {
		const button = page.locator(selector).first()
		if (await button.isVisible({ timeout: 1500 }).catch(() => false)) {
			await button.click()
			return true
		}
	}

	const frameLocator = page.frameLocator('#chatframe')
	const innerSelectors = [
		'yt-live-chat-header-renderer #close-button button',
		'yt-live-chat-header-renderer #close-button yt-icon-button',
		'yt-live-chat-header-renderer button[aria-label="Close"]',
		'yt-live-chat-header-renderer button[title="Close"]',
	]
	for (const selector of innerSelectors) {
		const button = frameLocator.locator(selector).first()
		if (await button.isVisible({ timeout: 1500 }).catch(() => false)) {
			await button.click()
			return true
		}
	}

	return false
}
