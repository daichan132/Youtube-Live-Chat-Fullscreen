import type { Extension } from '@e2e/fixtures'
import { DEFAULT_CHAT_SETTINGS } from '../../shared/settings/migrateSettings'
import type { ChatAppearance, ChatDisplay, ChatGeometry, PresetEntry } from '../../shared/settings/model'
import { normalizeChatSettings } from '../../shared/settings/normalizeSettings'
import { CHAT_STORAGE_KEY } from '../../shared/settings/storageKeys'

const STORE_KEY = CHAT_STORAGE_KEY

type StoreEntry = { schemaVersion: 1; writerId: string; value: Record<string, unknown> }

type OverlayStorePatch = {
  profile?: {
    appearance?: Partial<ChatAppearance>
    display?: Partial<ChatDisplay>
  }
  geometry?: ChatGeometry
  presets?: PresetEntry[]
}

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
 * Patch properties in the chat settings repository envelope in chrome.storage.local.
 *
 * Uses extension.storage (SW-backed or popup-based) for read-modify-write.
 *
 * @returns The verified store state, or null if the patch failed.
 */
export const patchOverlayStore = async (extension: Extension, overrides: OverlayStorePatch): Promise<Record<string, unknown> | null> => {
  const raw = await extension.storage.get(STORE_KEY)
  const stored = parseStoreValue(raw[STORE_KEY])
  const existed = stored?.value != null
  const current = normalizeChatSettings(stored?.value, DEFAULT_CHAT_SETTINGS)
  const state = normalizeChatSettings(
    {
      profile: {
        appearance: {
          ...current.profile.appearance,
          ...overrides.profile?.appearance,
        },
        display: {
          ...current.profile.display,
          ...overrides.profile?.display,
        },
      },
      geometry: overrides.geometry ?? current.geometry,
      presets: overrides.presets ?? current.presets,
    },
    current,
  )
  const nextStored: StoreEntry = {
    schemaVersion: 1,
    writerId: 'ylc-e2e',
    value: state,
  }

  await extension.storage.set({ [STORE_KEY]: nextStored })

  const verify = await extension.storage.get(STORE_KEY)
  const verifyState = parseStoreValue(verify[STORE_KEY])?.value ?? null

  if (!verifyState) {
    console.warn('[patchOverlayStore] Write verification failed')
    return null
  }

  const overrideKeys = Object.keys(overrides)
  const verified = overrideKeys.every(key => verifyState[key] !== undefined)
  console.log(`[patchOverlayStore] existed=${existed}, overrides verified=${verified}, keys=${overrideKeys.join(',')}`)

  return verifyState
}
