import type { Locator } from '@playwright/test'

export type ReliableClickOptions = {
  /** Enable JS fallback (Stage 3: dispatchEvent). Default: false. */
  allowJsFallback?: boolean
  /** Timeout for the normal click (Stage 1). Default: 5000. */
  timeoutMs?: number
}

/**
 * Clicks a button with state-verification fallback.
 *
 * 1. Normal Playwright click (actionability checks run; addLocatorHandler fires)
 * 2. Force Playwright click (bypasses actionability checks)
 * 3. (opt-in) JS click via dispatchEvent (isTrusted:false — last resort)
 *
 * Stages escalate only when verify() returns false, avoiding the
 * "always double-click" anti-pattern that reverts toggle UI.
 *
 * Starting with a normal click is important: force:true skips actionability
 * checks, which means addLocatorHandler() (e.g. consent dialog auto-dismiss)
 * won't fire. The normal click lets Playwright's built-in overlay detection
 * work first, and we only escalate when that path fails.
 *
 * Stage 3 is opt-in (`allowJsFallback: true`) because JS clicks bypass the
 * trusted-event path and may hide real UI bugs.
 */
export const reliableClick = async (
  locator: Locator,
  verify: () => Promise<boolean>,
  options: ReliableClickOptions = {},
) => {
  const { allowJsFallback = false, timeoutMs = 5_000 } = options

  // Stage 1: Normal click — actionability checks + addLocatorHandler active
  try {
    await locator.click({ timeout: timeoutMs })
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

  if (!allowJsFallback) {
    throw new Error('reliableClick: normal/force click did not produce expected state')
  }

  // Stage 3: JS click via dispatchEvent — isTrusted:false, some frameworks may ignore
  await locator.dispatchEvent('click')
  if (!(await verify().catch(() => false))) {
    throw new Error('reliableClick: all 3 stages failed to produce expected state')
  }
}
