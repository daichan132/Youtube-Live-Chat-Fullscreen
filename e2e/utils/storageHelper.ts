import type { Extension } from '@e2e/fixtures'

const STORE_KEY = 'ytdLiveChatStore'

type StoreEntry = { state: Record<string, unknown>; version: number }

const parseStoreValue = (rawValue: unknown): StoreEntry | null => {
  if (typeof rawValue === 'string') {
    try {
      return JSON.parse(rawValue)
    } catch {
      return null
    }
  }
  if (typeof rawValue === 'object' && rawValue !== null) {
    return rawValue as StoreEntry
  }
  return null
}

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
  let stored = parseStoreValue(raw[STORE_KEY])

  const existed = stored?.state != null
  if (stored?.state) {
    Object.assign(stored.state, overrides)
  } else {
    stored = { state: { ...overrides }, version: 2 }
  }

  await extension.storage.set({ [STORE_KEY]: JSON.stringify(stored) })

  const verify = await extension.storage.get(STORE_KEY)
  const verifyState = parseStoreValue(verify[STORE_KEY])?.state ?? null

  if (!verifyState) {
    console.warn('[patchOverlayStore] Write verification failed')
    return null
  }

  const overrideKeys = Object.keys(overrides)
  const verified = overrideKeys.every(k => verifyState[k] !== undefined)
  console.log(`[patchOverlayStore] existed=${existed}, overrides verified=${verified}, keys=${overrideKeys.join(',')}`)

  return verifyState
}
