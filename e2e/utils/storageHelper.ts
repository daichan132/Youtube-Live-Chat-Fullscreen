import type { Extension } from '../fixtures'

const STORE_KEY = 'ytdLiveChatStore'

/**
 * Patch properties in the ytdLiveChatStore persisted in chrome.storage.local.
 *
 * Uses extension.storage (SW-backed or popup-based) for read-modify-write.
 *
 * @returns The verified store state, or null if the patch failed.
 */
export const patchOverlayStore = async (
  extension: Extension,
  overrides: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
  const raw = await extension.storage.get(STORE_KEY)
  const rawValue = raw[STORE_KEY]

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
    Object.assign(stored.state, overrides)
  } else {
    stored = { state: { ...overrides }, version: 2 }
  }

  await extension.storage.set({ [STORE_KEY]: JSON.stringify(stored) })

  const verify = await extension.storage.get(STORE_KEY)
  const verifyValue = verify[STORE_KEY]
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

  if (!verifyState) {
    console.warn('[patchOverlayStore] Write verification failed')
    return null
  }

  const overrideKeys = Object.keys(overrides)
  const verified = overrideKeys.every(k => verifyState?.[k] !== undefined)
  console.log(`[patchOverlayStore] existed=${existed}, overrides verified=${verified}, keys=${overrideKeys.join(',')}`)

  return verifyState
}
