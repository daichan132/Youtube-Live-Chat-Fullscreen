import type { Locator } from '@playwright/test'

/**
 * Clicks a button with three-stage state-verification fallback.
 *
 * 1. Normal Playwright click (actionability checks run; addLocatorHandler fires)
 * 2. Force Playwright click (bypasses actionability checks)
 * 3. JS click via locator.evaluate() (isTrusted:false — last resort)
 *
 * Stages escalate only when verify() returns false, avoiding the
 * "always double-click" anti-pattern that reverts toggle UI.
 *
 * Starting with a normal click is important: force:true skips actionability
 * checks, which means addLocatorHandler() (e.g. consent dialog auto-dismiss)
 * won't fire. The normal click lets Playwright's built-in overlay detection
 * work first, and we only escalate when that path fails.
 */
export const reliableClick = async (
  locator: Locator,
  verify: () => Promise<boolean>,
) => {
  // Stage 1: Normal click — actionability checks + addLocatorHandler active
  try {
    await locator.click({ timeout: 5_000 })
  } catch {
    // actionability failure — escalate
  }
  if (await verify().catch(() => false)) return

  // Stage 2: Force click — skip actionability checks
  try {
    await locator.click({ force: true })
  } catch {
    // click dispatch failure — escalate
  }
  if (await verify().catch(() => false)) return

  // Stage 3: JS click — isTrusted:false, some frameworks may ignore
  await locator.evaluate(el => (el as HTMLElement).click())
  if (!(await verify().catch(() => false))) {
    throw new Error('reliableClick: all 3 stages failed to produce expected state')
  }
}
