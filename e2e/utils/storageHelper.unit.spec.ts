import { describe, expect, it } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '../../shared/settings/migrateSettings'
import type { ChatGeometry } from '../../shared/settings/model'
import { APPEARANCE_STORAGE_KEY, GEOMETRY_STORAGE_KEY, LEGACY_CHAT_STORAGE_KEY } from '../../shared/settings/storageKeys'
import type { ExtensionStorage } from '../support/extension/extensionStorage'
import { patchOverlayStore } from './storageHelper'

const envelope = (value: unknown) => ({ schemaVersion: 1, writerId: 'existing-writer', value })
const geometry = {
  reference: 'player',
  rect: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
  pinned: true,
} satisfies ChatGeometry

const createStorage = (afterWrite: (items: Record<string, unknown>) => Record<string, unknown> = items => items) => {
  const values: Record<string, unknown> = {
    [APPEARANCE_STORAGE_KEY]: envelope({ profile: DEFAULT_CHAT_SETTINGS.profile, presets: [{ kind: 'builtin', id: 'readable' }] }),
    [GEOMETRY_STORAGE_KEY]: envelope(geometry),
    unrelated: { retained: true },
  }
  const storage: ExtensionStorage = {
    async get(keys) {
      const selectedKeys = keys === null || keys === undefined ? Object.keys(values) : typeof keys === 'string' ? [keys] : keys
      return structuredClone(Object.fromEntries(selectedKeys.filter(key => key in values).map(key => [key, values[key]])))
    },
    async set(items) {
      Object.assign(values, structuredClone(afterWrite(items)))
    },
    async clear() {
      throw new Error('Patching settings must preserve other storage domains')
    },
  }
  return { storage, values }
}

describe('overlay fixture storage setup', () => {
  it('returns persisted values and preserves settings outside the patch', async () => {
    const { storage } = createStorage()

    const result = await patchOverlayStore({ storage }, { profile: { appearance: { fontSize: 27 } } })

    expect(result).toMatchObject({
      profile: { appearance: { fontSize: 27 }, display: DEFAULT_CHAT_SETTINGS.profile.display },
      presets: [{ kind: 'builtin', id: 'readable' }],
      geometry,
    })
    expect(await storage.get()).toMatchObject({
      [APPEARANCE_STORAGE_KEY]: { value: { profile: { appearance: { fontSize: 27 } }, presets: [{ kind: 'builtin', id: 'readable' }] } },
      [GEOMETRY_STORAGE_KEY]: { value: geometry },
      unrelated: { retained: true },
    })
    expect(await storage.get(LEGACY_CHAT_STORAGE_KEY)).toEqual({})
  })

  it.each([APPEARANCE_STORAGE_KEY, GEOMETRY_STORAGE_KEY])(
    'rejects a silently dropped write to %s even when an older envelope exists',
    async key => {
      const { storage } = createStorage(items => Object.fromEntries(Object.entries(items).filter(([name]) => name !== key)))

      await expect(
        patchOverlayStore(
          { storage },
          {
            profile: { appearance: { fontSize: 27 } },
            geometry: { ...geometry, rect: { ...geometry.rect, x: 0.5 } },
          },
        ),
      ).rejects.toThrow('Settings readback did not match the requested values')
    },
  )

  it('rejects a readback that loses an unpatched setting', async () => {
    const { storage } = createStorage(items => ({
      ...items,
      [APPEARANCE_STORAGE_KEY]: envelope({
        profile: { ...DEFAULT_CHAT_SETTINGS.profile, appearance: { ...DEFAULT_CHAT_SETTINGS.profile.appearance, fontSize: 27 } },
        presets: [],
      }),
    }))

    await expect(patchOverlayStore({ storage }, { profile: { appearance: { fontSize: 27 } } })).rejects.toThrow(
      'Settings readback did not match the requested values',
    )
  })

  it('uses legacy settings only as a fallback and leaves the compatibility value intact', async () => {
    const { storage, values } = createStorage()
    delete values[APPEARANCE_STORAGE_KEY]
    delete values[GEOMETRY_STORAGE_KEY]
    const legacy = JSON.stringify(
      envelope({
        ...DEFAULT_CHAT_SETTINGS,
        profile: {
          ...DEFAULT_CHAT_SETTINGS.profile,
          appearance: { ...DEFAULT_CHAT_SETTINGS.profile.appearance, fontSize: 23 },
        },
        geometry,
      }),
    )
    values[LEGACY_CHAT_STORAGE_KEY] = legacy

    expect(await patchOverlayStore({ storage }, { profile: { display: { contentMode: 'messages-only' } } })).toMatchObject({
      profile: { appearance: { fontSize: 23 }, display: { contentMode: 'messages-only' } },
      geometry,
    })
    expect(await storage.get(LEGACY_CHAT_STORAGE_KEY)).toEqual({ [LEGACY_CHAT_STORAGE_KEY]: legacy })
  })
})
