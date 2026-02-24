import type { Page } from '@playwright/test'

const STORE_KEY = 'ytdLiveChatStore'

/**
 * Patch properties in the ytdLiveChatStore persisted in chrome.storage.local.
 *
 * Strategy:
 * 1. Open popup to get chrome.storage.local access (extension context required).
 * 2. Read existing store — if it exists, merge overrides into state.
 *    If it doesn't (first launch), create a new entry with just the overrides.
 *    Zustand persist will shallow-merge with defaults on rehydration.
 * 3. Write back as a JSON string (matching createJSONStorage format).
 * 4. Navigate away immediately to prevent popup's Zustand from overwriting.
 *
 * @returns The verified store state, or null if the patch failed.
 */
export const patchOverlayStore = async (
  page: Page,
  extensionId: string,
  overrides: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`

  // Step 1: Open popup for chrome.storage.local access
  await page.goto(popupUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })

  // Step 2: Write overrides directly to chrome.storage.local
  const result = await page.evaluate(
    async ({ storeKey, overrides }) => {
      // Read existing store if present
      const raw = await chrome.storage.local.get(storeKey)
      const rawValue = raw[storeKey]

      let stored: { state: Record<string, unknown>; version: number } | null = null
      if (typeof rawValue === 'string') {
        try {
          stored = JSON.parse(rawValue)
        } catch {
          stored = null
        }
      } else if (typeof rawValue === 'object' && rawValue !== null) {
        stored = rawValue as { state: Record<string, unknown>; version: number }
      }

      const existed = stored?.state != null
      if (stored?.state) {
        // Existing store — merge overrides
        Object.assign(stored.state, overrides)
      } else {
        // No store yet — create with just the overrides.
        // Zustand persist will shallow-merge this with its initial state on rehydration.
        stored = { state: { ...overrides }, version: 2 }
      }

      // Write as JSON string (matching createJSONStorage format from zustand)
      await chrome.storage.local.set({ [storeKey]: JSON.stringify(stored) })

      // Verify the write
      const verify = await chrome.storage.local.get(storeKey)
      const verifyValue = verify[storeKey]
      let verifyState: Record<string, unknown> | null = null
      if (typeof verifyValue === 'string') {
        try {
          verifyState = JSON.parse(verifyValue).state ?? null
        } catch {
          verifyState = null
        }
      } else if (typeof verifyValue === 'object' && verifyValue !== null) {
        verifyState = (verifyValue as { state: Record<string, unknown> }).state ?? null
      }

      return { existed, state: verifyState }
    },
    { storeKey: STORE_KEY, overrides },
  )

  if (!result.state) {
    console.error('[patchOverlayStore] Write verification failed')
    return null
  }

  const overrideKeys = Object.keys(overrides)
  const verified = overrideKeys.every(k => result.state![k] !== undefined)
  console.log(
    `[patchOverlayStore] existed=${result.existed}, overrides verified=${verified}, keys=${overrideKeys.join(',')}`,
  )

  // Step 3: Navigate away to prevent popup's Zustand from overwriting
  await page.goto('about:blank')

  return result.state
}
