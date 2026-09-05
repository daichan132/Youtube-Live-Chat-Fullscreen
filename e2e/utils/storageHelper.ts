import type { Extension } from '@e2e/fixtures'
import { DEFAULT_CHAT_SETTINGS } from '../../shared/settings/migrateSettings'
import type { ChatAppearance, ChatDisplay, ChatGeometry, PresetEntry } from '../../shared/settings/model'
import { normalizeChatSettings } from '../../shared/settings/normalizeSettings'
import { APPEARANCE_STORAGE_KEY, GEOMETRY_STORAGE_KEY, LEGACY_CHAT_STORAGE_KEY } from '../../shared/settings/storageKeys'

type StoreEntry<T> = { schemaVersion: 1; writerId: string; value: T }
type AppearanceValue = { profile: typeof DEFAULT_CHAT_SETTINGS.profile; presets: PresetEntry[] }

type OverlayStorePatch = {
  profile?: {
    appearance?: Partial<ChatAppearance>
    display?: Partial<ChatDisplay>
  }
  geometry?: ChatGeometry
  presets?: PresetEntry[]
}

const parseStoreValue = <T>(rawValue: unknown): StoreEntry<T> | null => {
  let parsed = rawValue
  if (typeof rawValue === 'string') {
    try {
      parsed = JSON.parse(rawValue)
    } catch {
      return null
    }
  }
  if (!parsed || typeof parsed !== 'object') return null
  const envelope = parsed as Partial<StoreEntry<T>>
  if (envelope.schemaVersion !== 1 || typeof envelope.writerId !== 'string' || !('value' in envelope)) return null
  return envelope as StoreEntry<T>
}

/**
 * Patch the current appearance and geometry ownership domains in chrome.storage.local.
 * The legacy combined chat key is read only as a compatibility fallback and is never written.
 *
 * @returns The verified combined chat state, or null if the patch failed.
 */
export const patchOverlayStore = async (extension: Extension, overrides: OverlayStorePatch): Promise<Record<string, unknown> | null> => {
  const raw = await extension.storage.get([APPEARANCE_STORAGE_KEY, GEOMETRY_STORAGE_KEY, LEGACY_CHAT_STORAGE_KEY])
  const storedAppearance = parseStoreValue<AppearanceValue>(raw[APPEARANCE_STORAGE_KEY])
  const storedGeometry = parseStoreValue<ChatGeometry>(raw[GEOMETRY_STORAGE_KEY])
  const legacyChat = parseStoreValue<Record<string, unknown>>(raw[LEGACY_CHAT_STORAGE_KEY])
  const compatibilityState = normalizeChatSettings(legacyChat?.value, DEFAULT_CHAT_SETTINGS)
  const current = normalizeChatSettings(
    {
      profile: storedAppearance?.value.profile ?? compatibilityState.profile,
      presets: storedAppearance?.value.presets ?? compatibilityState.presets,
      geometry: storedGeometry?.value ?? compatibilityState.geometry,
    },
    compatibilityState,
  )
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
  const writerId = 'ylc-e2e'
  const appearanceEntry: StoreEntry<AppearanceValue> = {
    schemaVersion: 1,
    writerId,
    value: { profile: state.profile, presets: state.presets },
  }
  const geometryEntry: StoreEntry<ChatGeometry> = {
    schemaVersion: 1,
    writerId,
    value: state.geometry,
  }

  await extension.storage.set({
    [APPEARANCE_STORAGE_KEY]: appearanceEntry,
    [GEOMETRY_STORAGE_KEY]: geometryEntry,
  })

  const verify = await extension.storage.get([APPEARANCE_STORAGE_KEY, GEOMETRY_STORAGE_KEY])
  const verifiedAppearance = parseStoreValue<AppearanceValue>(verify[APPEARANCE_STORAGE_KEY])
  const verifiedGeometry = parseStoreValue<ChatGeometry>(verify[GEOMETRY_STORAGE_KEY])
  if (!verifiedAppearance || !verifiedGeometry) {
    console.warn('[patchOverlayStore] Write verification failed')
    return null
  }

  const verified =
    (overrides.profile === undefined || verifiedAppearance.value.profile !== undefined) &&
    (overrides.presets === undefined || verifiedAppearance.value.presets !== undefined) &&
    (overrides.geometry === undefined || verifiedGeometry.value !== undefined)
  console.log(`[patchOverlayStore] current domains verified=${verified}, keys=${Object.keys(overrides).join(',')}`)

  return state as unknown as Record<string, unknown>
}
