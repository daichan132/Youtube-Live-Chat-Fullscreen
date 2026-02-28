import type { Locator } from '@playwright/test'

/**
 * Clicks a button with state-verification fallback.
 *
 * 1. Playwright click with force: true (bypasses actionability checks)
 * 2. Verify the expected state change occurred
 * 3. If verification fails, fall back to a JS click via locator.evaluate()
 *
 * This avoids the "always double-click" anti-pattern that reverts toggle UI.
 * locator.evaluate() reaches Shadow DOM elements that document.querySelector() cannot.
 *
 * Note: The JS fallback fires an isTrusted:false event — some frameworks may ignore it.
 * That's why Playwright click is tried first and JS click is only a fallback.
 */
export const reliableClick = async (
  locator: Locator,
  verify: () => Promise<boolean>,
) => {
  await locator.click({ force: true })
  if (await verify().catch(() => false)) return
  await locator.evaluate(el => (el as HTMLElement).click())
}
