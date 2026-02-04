import type { Locator, Page } from '@playwright/test'

/**
 * Reliably clicks a button using both Playwright's click and a JavaScript click.
 *
 * YouTube's player controls can sometimes have overlay elements or event handlers
 * that interfere with Playwright's click. This utility ensures the click registers
 * by using both methods:
 * 1. Playwright click with force: true to bypass actionability checks
 * 2. Direct JavaScript click on the DOM element
 *
 * @param locator - The Playwright locator for the button
 * @param page - The Playwright page object
 * @param selector - The CSS selector string for the JavaScript click
 */
export const reliableClick = async (locator: Locator, page: Page, selector: string) => {
  await locator.click({ force: true })
  await page.evaluate((sel) => {
    const button = document.querySelector<HTMLButtonElement>(sel)
    button?.click()
  }, selector)
}
