import type { Extension } from '@e2e/fixtures'
import { DEFAULT_CHAT_SETTINGS } from '../../shared/settings/migrateSettings'
import type { ChatAppearance, ChatDisplay, ChatGeometry, PresetEntry } from '../../shared/settings/model'
import { normalizeChatSettings } from '../../shared/settings/normalizeSettings'
import { YTD_LIVE_CHAT_PERSIST } from '../../shared/settings/persistConfig'

const STORE_KEY = 'ytdLiveChatStore'

type StoreEntry = { state: Record<string, unknown>; version: number }

type OverlayStorePatch = {
  profile?: {
    appearance?: Partial<ChatAppearance>
    display?: Partial<ChatDisplay>
  }
  geometry?: {
    coordinates?: Partial<ChatGeometry['coordinates']>
    size?: Partial<ChatGeometry['size']>
  }
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
 * Patch properties in the ytdLiveChatStore persisted in chrome.storage.local.
 *
 * Uses extension.storage (SW-backed or popup-based) for read-modify-write.
 *
 * @returns The verified store state, or null if the patch failed.
 */
export const patchOverlayStore = async (extension: Extension, overrides: OverlayStorePatch): Promise<Record<string, unknown> | null> => {
  const raw = await extension.storage.get(STORE_KEY)
  const stored = parseStoreValue(raw[STORE_KEY])
  const existed = stored?.state != null
  const current = normalizeChatSettings(stored?.state, DEFAULT_CHAT_SETTINGS)
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
      geometry: {
        coordinates: {
          ...current.geometry.coordinates,
          ...overrides.geometry?.coordinates,
        },
        size: {
          ...current.geometry.size,
          ...overrides.geometry?.size,
        },
      },
      presets: overrides.presets ?? current.presets,
    },
    current,
  )
  const nextStored: StoreEntry = {
    state,
    version: YTD_LIVE_CHAT_PERSIST.version,
  }

  await extension.storage.set({ [STORE_KEY]: JSON.stringify(nextStored) })

  const verify = await extension.storage.get(STORE_KEY)
  const verifyState = parseStoreValue(verify[STORE_KEY])?.state ?? null

  if (!verifyState) {
    console.warn('[patchOverlayStore] Write verification failed')
    return null
  }

  const overrideKeys = Object.keys(overrides)
  const verified = overrideKeys.every(key => verifyState[key] !== undefined)
  console.log(`[patchOverlayStore] existed=${existed}, overrides verified=${verified}, keys=${overrideKeys.join(',')}`)

  return verifyState
}
