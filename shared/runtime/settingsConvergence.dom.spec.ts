import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSettingsRepository, type SettingsRepository } from '@/shared/settings/repository'
import {
  APPEARANCE_STORAGE_KEY,
  ENABLED_STORAGE_KEY,
  GEOMETRY_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from '@/shared/settings/storageKeys'
import {
  chatSettingsStateAtom,
  EMPTY_MESSAGES,
  editorSessionStateAtom,
  effectiveProfileAtom,
  globalSettingsStateAtom,
  localeStateAtom,
} from '@/shared/state/atoms'
import {
  commitGeometryAtom,
  commitStylePatchAtom,
  finishStyleGestureAtom,
  previewStylePatchAtom,
  setThemeModeAtom,
} from '@/shared/state/commands'
import { type AppRuntime, createAppRuntime } from './createAppRuntime'

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>(next => {
    resolve = next
  })
  return { promise, resolve }
}

const sessions: { runtime: AppRuntime; repository: SettingsRepository }[] = []
const releases: (() => void)[] = []

const createSession = async (writerId = 'local-editor', waitBeforeRetry = async () => {}) => {
  const repository = createSettingsRepository(writerId, null, { waitBeforeRetry })
  const runtime = await createAppRuntime(repository, { loadMessages: async () => EMPTY_MESSAGES })
  const session = { runtime, repository }
  sessions.push(session)
  return session
}

// Keep the real repository, app runtime, atoms and Storage events connected.
// Only delay delivery of a captured Storage read to choose the race order.
const pauseNextReadback = () => {
  const started = deferred()
  const release = deferred()
  const originalGet = chrome.storage.local.get.bind(chrome.storage.local)
  let pending = true
  vi.spyOn(chrome.storage.local, 'get').mockImplementation(async keys => {
    const snapshot = structuredClone(await originalGet(keys))
    if (pending) {
      pending = false
      started.resolve()
      await release.promise
    }
    return snapshot
  })
  releases.push(release.resolve)
  return { started: started.promise, release: release.resolve }
}

beforeEach(async () => {
  await chrome.storage.local.clear()
})

afterEach(async () => {
  for (const release of releases.splice(0)) release()
  await Promise.allSettled(sessions.map(({ repository }) => repository.flush()))
  for (const { runtime } of sessions.splice(0)) runtime.dispose()
  vi.restoreAllMocks()
})

describe('settings persistence and editor convergence', () => {
  it('saves a local theme and applies another context’s global settings without writing them back', async () => {
    const { runtime, repository } = await createSession()
    runtime.store.set(setThemeModeAtom, 'dark')
    await repository.flush()
    expect((await chrome.storage.local.get(THEME_STORAGE_KEY))[THEME_STORAGE_KEY]).toEqual({
      schemaVersion: 1,
      writerId: 'local-editor',
      value: 'dark',
    })

    const theme = { schemaVersion: 1, writerId: 'other-context', value: 'light' }
    const enabled = { schemaVersion: 1, writerId: 'other-context', value: false }
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: theme, [ENABLED_STORAGE_KEY]: enabled })
    await vi.waitFor(() => expect(runtime.store.get(globalSettingsStateAtom)).toEqual({ themeMode: 'light', ytdLiveChat: false }))
    await repository.flush()
    expect(await chrome.storage.local.get([THEME_STORAGE_KEY, ENABLED_STORAGE_KEY])).toEqual({
      [THEME_STORAGE_KEY]: theme,
      [ENABLED_STORAGE_KEY]: enabled,
    })
  })

  it('applies external geometry without discarding an appearance draft or its history', async () => {
    const { runtime, repository } = await createSession()
    runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 24 } })
    await repository.flush()
    runtime.store.set(previewStylePatchAtom, { id: 'font-size', patch: { appearance: { fontSize: 30 } } })
    const editing = structuredClone(runtime.store.get(editorSessionStateAtom))
    const geometry = { reference: 'player', rect: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 }, pinned: true }
    const external = { schemaVersion: 1, writerId: 'other-context', value: geometry }
    await chrome.storage.local.set({ [GEOMETRY_STORAGE_KEY]: external })
    await vi.waitFor(() => expect(runtime.store.get(chatSettingsStateAtom).geometry).toEqual(geometry))

    expect(runtime.store.get(editorSessionStateAtom)).toEqual(editing)
    expect(runtime.store.get(effectiveProfileAtom).appearance.fontSize).toBe(30)
    await repository.flush()
    expect((await chrome.storage.local.get(GEOMETRY_STORAGE_KEY))[GEOMETRY_STORAGE_KEY]).toEqual(external)
  })

  it('keeps the next draft and undo history when a previous save is acknowledged', async () => {
    const { runtime, repository } = await createSession()
    const readback = pauseNextReadback()
    runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 24 } })
    await readback.started

    runtime.store.set(previewStylePatchAtom, { id: 'font-size', patch: { appearance: { fontSize: 30 } } })
    const editing = runtime.store.get(editorSessionStateAtom)
    readback.release()
    await repository.flush()

    expect(runtime.store.get(editorSessionStateAtom)).toBe(editing)
    expect(editing.past).toHaveLength(1)
    expect(runtime.store.get(effectiveProfileAtom).appearance.fontSize).toBe(30)
    expect(runtime.store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(24)

    runtime.store.set(finishStyleGestureAtom, 'font-size')
    await repository.flush()
    expect((await repository.load()).chat.profile.appearance.fontSize).toBe(30)
    expect(runtime.store.get(editorSessionStateAtom).past).toHaveLength(2)
  })

  it('does not apply a captured readback over a newer external commit', async () => {
    const { runtime, repository } = await createSession()
    const readback = pauseNextReadback()
    runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 24 } })
    await readback.started
    const current = runtime.store.get(chatSettingsStateAtom)
    const profile = { ...current.profile, appearance: { ...current.profile.appearance, fontSize: 32 } }
    await chrome.storage.local.set({
      [APPEARANCE_STORAGE_KEY]: {
        schemaVersion: 1,
        writerId: 'external-editor',
        value: { profile, presets: current.presets },
      },
    })
    await vi.waitFor(() => expect(runtime.store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(32))

    readback.release()
    await repository.flush()

    expect(runtime.store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(32)
    expect((await repository.load()).chat.profile.appearance.fontSize).toBe(32)
  })

  it('keeps a newer local commit while an older readback is pending', async () => {
    const { runtime, repository } = await createSession()
    const readback = pauseNextReadback()
    runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 24 } })
    await readback.started
    runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 32 } })
    readback.release()
    await repository.flush()

    expect(runtime.store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(32)
    expect((await repository.load()).chat.profile.appearance.fontSize).toBe(32)
    expect(runtime.store.get(editorSessionStateAtom).past).toHaveLength(2)
  })

  it('does not retry an obsolete failed edit over a newer value saved by another context', async () => {
    const retryStarted = deferred()
    const releaseRetry = deferred()
    releases.push(releaseRetry.resolve)
    const local = await createSession('local-editor', async () => {
      retryStarted.resolve()
      await releaseRetry.promise
    })
    const other = await createSession('other-editor')
    vi.spyOn(chrome.storage.local, 'set').mockRejectedValueOnce(new Error('temporary write failure'))

    local.runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 24 } })
    await retryStarted.promise
    other.runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 32 } })
    await other.repository.flush()
    await vi.waitFor(() =>
      expect(local.runtime.exportSettings()).toMatchObject({ chatSettings: { profile: { appearance: { fontSize: 32 } } } }),
    )

    // Storage is available again, but the delayed retry must not revive 24px.
    releaseRetry.resolve()
    await local.repository.flush()

    expect((await chrome.storage.local.get(APPEARANCE_STORAGE_KEY))[APPEARANCE_STORAGE_KEY]).toMatchObject({
      writerId: 'other-editor',
      value: { profile: { appearance: { fontSize: 32 } } },
    })
    expect(local.runtime.exportSettings()).toMatchObject({ chatSettings: { profile: { appearance: { fontSize: 32 } } } })
    expect(other.runtime.exportSettings()).toMatchObject({ chatSettings: { profile: { appearance: { fontSize: 32 } } } })
  })

  it('does not let a manual retry waiting for import overwrite a newer external commit', async () => {
    const { runtime, repository } = await createSession()
    const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
    vi.spyOn(chrome.storage.local, 'set')
      .mockRejectedValueOnce(new Error('theme write failed'))
      .mockRejectedValueOnce(new Error('theme retry failed'))
    runtime.store.set(setThemeModeAtom, 'dark')
    await expect(repository.flush()).rejects.toThrow('theme write failed')

    const readback = pauseNextReadback()
    const importing = runtime.importSettings(runtime.exportSettings())
    const retrying = repository.retryFailed()
    await readback.started
    await originalSet({ [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'external-editor', value: 'light' } })
    readback.release()
    await Promise.all([importing, retrying])

    expect(runtime.store.get(globalSettingsStateAtom).themeMode).toBe('light')
    expect((await chrome.storage.local.get(THEME_STORAGE_KEY))[THEME_STORAGE_KEY]).toMatchObject({
      writerId: 'external-editor',
      value: 'light',
    })
    expect(repository.getPersistenceStatus().status).toBe('idle')
  })

  it.each(['no update', 'invalid external', 'new local'] as const)('handles a manual retry waiting for import with %s', async update => {
    const { runtime, repository } = await createSession()
    const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
    const set = vi
      .spyOn(chrome.storage.local, 'set')
      .mockRejectedValueOnce(new Error('theme write failed'))
      .mockRejectedValueOnce(new Error('theme retry failed'))
    runtime.store.set(setThemeModeAtom, 'dark')
    await expect(repository.flush()).rejects.toThrow('theme write failed')

    const readback = pauseNextReadback()
    const importing = runtime.importSettings(runtime.exportSettings())
    const retrying = repository.retryFailed()
    await readback.started
    if (update === 'invalid external') {
      await originalSet({ [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-context', value: 'DARK' } })
    } else if (update === 'new local') {
      runtime.store.set(setThemeModeAtom, 'light')
    }
    readback.release()
    await Promise.all([importing, retrying])

    const expected = update === 'new local' ? 'light' : 'dark'
    expect(runtime.store.get(globalSettingsStateAtom).themeMode).toBe(expected)
    expect((await chrome.storage.local.get(THEME_STORAGE_KEY))[THEME_STORAGE_KEY]).toMatchObject({
      writerId: 'local-editor',
      value: expected,
    })
    expect(repository.getPersistenceStatus().status).toBe('idle')
    // Two failed writes, the import, and exactly one later local write.
    expect(set).toHaveBeenCalledTimes(4)
  })

  it('does not let an invalid external theme cancel a pending valid theme retry', async () => {
    const retryStarted = deferred()
    const releaseRetry = deferred()
    releases.push(releaseRetry.resolve)
    const { runtime, repository } = await createSession('local-editor', async () => {
      retryStarted.resolve()
      await releaseRetry.promise
    })
    vi.spyOn(chrome.storage.local, 'set').mockRejectedValueOnce(new Error('temporary write failure'))
    runtime.store.set(setThemeModeAtom, 'dark')
    await retryStarted.promise
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-context', value: 'DARK' } })

    expect(runtime.store.get(globalSettingsStateAtom).themeMode).toBe('dark')
    releaseRetry.resolve()
    await repository.flush()

    expect((await chrome.storage.local.get(THEME_STORAGE_KEY))[THEME_STORAGE_KEY]).toMatchObject({
      writerId: 'local-editor',
      value: 'dark',
    })
    expect(runtime.store.get(globalSettingsStateAtom).themeMode).toBe('dark')
    expect(repository.getPersistenceStatus().status).toBe('idle')
  })

  it('reports an invalid external theme read back after a successful write and can retry the local value', async () => {
    const { runtime, repository } = await createSession()
    const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
    vi.spyOn(chrome.storage.local, 'set').mockImplementationOnce(async values => {
      await originalSet(values)
      await originalSet({ [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-context', value: 'DARK' } })
    })

    runtime.store.set(setThemeModeAtom, 'dark')
    await expect(repository.flush()).rejects.toThrow('Settings could not be confirmed')

    expect(runtime.store.get(globalSettingsStateAtom).themeMode).toBe('dark')
    expect(repository.getPersistenceStatus()).toEqual({ status: 'error', failedDomains: ['theme'] })
    expect((await chrome.storage.local.get(THEME_STORAGE_KEY))[THEME_STORAGE_KEY]).toMatchObject({
      writerId: 'other-context',
      value: 'DARK',
    })
    await repository.retryFailed()
    await repository.flush()
    expect((await chrome.storage.local.get(THEME_STORAGE_KEY))[THEME_STORAGE_KEY]).toMatchObject({
      writerId: 'local-editor',
      value: 'dark',
    })
    expect(repository.getPersistenceStatus().status).toBe('idle')
  })

  it.each(['before', 'after'] as const)(
    'does not retry an unconfirmed old theme after a valid external commit %s the local write',
    async externalOrder => {
      const { runtime, repository } = await createSession()
      const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
      vi.spyOn(chrome.storage.local, 'set').mockImplementationOnce(async values => {
        if (externalOrder === 'before') {
          await originalSet({ [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-context', value: 'light' } })
        }
        await originalSet(values)
        if (externalOrder === 'after') {
          await originalSet({ [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-context', value: 'light' } })
        }
        await originalSet({ [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'broken-context', value: 'DARK' } })
      })

      runtime.store.set(setThemeModeAtom, 'dark')
      await repository.flush()
      await repository.retryFailed()

      expect(runtime.store.get(globalSettingsStateAtom).themeMode).toBe('light')
      expect(repository.getPersistenceStatus().status).toBe('idle')
      expect((await chrome.storage.local.get(THEME_STORAGE_KEY))[THEME_STORAGE_KEY]).toMatchObject({
        writerId: 'broken-context',
        value: 'DARK',
      })
    },
  )

  it('does not apply an invalid captured readback over a later valid external theme', async () => {
    const { runtime, repository } = await createSession()
    const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
    vi.spyOn(chrome.storage.local, 'set').mockImplementationOnce(async values => {
      await originalSet(values)
      await originalSet({ [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'broken-context', value: 'DARK' } })
    })
    const readback = pauseNextReadback()
    runtime.store.set(setThemeModeAtom, 'dark')
    await readback.started
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-context', value: 'light' } })
    readback.release()
    await repository.flush()
    await repository.retryFailed()

    expect(runtime.store.get(globalSettingsStateAtom).themeMode).toBe('light')
    expect(repository.getPersistenceStatus().status).toBe('idle')
    expect((await chrome.storage.local.get(THEME_STORAGE_KEY))[THEME_STORAGE_KEY]).toMatchObject({
      writerId: 'other-context',
      value: 'light',
    })
  })

  it.each(['external', 'local'] as const)('clears an unconfirmed old theme when a newer %s intent arrives', async source => {
    const { runtime, repository } = await createSession()
    const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
    vi.spyOn(chrome.storage.local, 'set').mockImplementationOnce(async values => {
      await originalSet(values)
      await originalSet({ [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'broken-context', value: 'DARK' } })
    })
    runtime.store.set(setThemeModeAtom, 'dark')
    await expect(repository.flush()).rejects.toThrow('Settings could not be confirmed')

    if (source === 'external') {
      await chrome.storage.local.set({ [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-context', value: 'light' } })
    } else {
      runtime.store.set(setThemeModeAtom, 'light')
      await repository.flush()
    }
    await repository.retryFailed()

    expect(runtime.store.get(globalSettingsStateAtom).themeMode).toBe('light')
    expect(repository.getPersistenceStatus().status).toBe('idle')
    expect((await chrome.storage.local.get(THEME_STORAGE_KEY))[THEME_STORAGE_KEY]).toMatchObject({ value: 'light' })
  })

  it('keeps a successful write when its best-effort readback is unavailable', async () => {
    const { runtime, repository } = await createSession()
    vi.spyOn(chrome.storage.local, 'get').mockRejectedValueOnce(new Error('readback unavailable'))

    runtime.store.set(setThemeModeAtom, 'dark')
    await repository.flush()

    expect(runtime.store.get(globalSettingsStateAtom).themeMode).toBe('dark')
    expect(repository.getPersistenceStatus().status).toBe('idle')
    expect((await chrome.storage.local.get(THEME_STORAGE_KEY))[THEME_STORAGE_KEY]).toMatchObject({ value: 'dark' })
  })

  it('does not let a non-object external appearance cancel a pending edit', async () => {
    const retryStarted = deferred()
    const releaseRetry = deferred()
    releases.push(releaseRetry.resolve)
    const { runtime, repository } = await createSession('local-editor', async () => {
      retryStarted.resolve()
      await releaseRetry.promise
    })
    vi.spyOn(chrome.storage.local, 'set').mockRejectedValueOnce(new Error('temporary write failure'))
    runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 24 } })
    await retryStarted.promise
    await chrome.storage.local.set({ [APPEARANCE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-context', value: null } })

    expect(runtime.store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(24)
    releaseRetry.resolve()
    await repository.flush()

    expect((await chrome.storage.local.get(APPEARANCE_STORAGE_KEY))[APPEARANCE_STORAGE_KEY]).toMatchObject({
      writerId: 'local-editor',
      value: { profile: { appearance: { fontSize: 24 } } },
    })
  })

  it('does not let a non-object external geometry cancel a pending edit', async () => {
    const retryStarted = deferred()
    const releaseRetry = deferred()
    releases.push(releaseRetry.resolve)
    const { runtime, repository } = await createSession('local-editor', async () => {
      retryStarted.resolve()
      await releaseRetry.promise
    })
    const geometry = { reference: 'player' as const, rect: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 }, pinned: true }
    vi.spyOn(chrome.storage.local, 'set').mockRejectedValueOnce(new Error('temporary write failure'))
    runtime.store.set(commitGeometryAtom, geometry)
    await retryStarted.promise
    await chrome.storage.local.set({ [GEOMETRY_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-context', value: null } })

    expect(runtime.store.get(chatSettingsStateAtom).geometry).toEqual(geometry)
    releaseRetry.resolve()
    await repository.flush()
    expect((await chrome.storage.local.get(GEOMETRY_STORAGE_KEY))[GEOMETRY_STORAGE_KEY]).toMatchObject({
      writerId: 'local-editor',
      value: geometry,
    })
  })

  it('continues to normalize partial external objects and an unsupported locale string', async () => {
    const { runtime } = await createSession()
    await runtime.setLocale('ja')
    await chrome.storage.local.set({
      [APPEARANCE_STORAGE_KEY]: {
        schemaVersion: 1,
        writerId: 'other-context',
        value: { profile: { appearance: { fontSize: 31 } }, presets: [] },
      },
      [GEOMETRY_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-context', value: { reference: 'player', rect: { x: 0.2 } } },
      [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-context', value: 'not-a-language' },
    })

    await vi.waitFor(() => expect(runtime.store.get(localeStateAtom).code).toBe('en'))
    expect(runtime.store.get(chatSettingsStateAtom)).toMatchObject({ profile: { appearance: { fontSize: 31 } }, presets: [] })
    expect(runtime.store.get(chatSettingsStateAtom).geometry).toMatchObject({ reference: 'player', rect: { x: 0.2 } })
  })

  it('preserves a profile draft when only the external preset list changes', async () => {
    const { runtime } = await createSession()
    runtime.store.set(previewStylePatchAtom, { id: 'font-size', patch: { appearance: { fontSize: 30 } } })
    const editing = runtime.store.get(editorSessionStateAtom)
    const current = runtime.store.get(chatSettingsStateAtom)
    const set = vi.spyOn(chrome.storage.local, 'set')
    await chrome.storage.local.set({
      [APPEARANCE_STORAGE_KEY]: {
        schemaVersion: 1,
        writerId: 'external-editor',
        value: {
          profile: current.profile,
          presets: [...current.presets, { kind: 'custom', id: 'external-preset', name: 'External', profile: current.profile }],
        },
      },
    })
    await vi.waitFor(() =>
      expect(runtime.store.get(chatSettingsStateAtom).presets.some(preset => preset.id === 'external-preset')).toBe(true),
    )

    expect(runtime.store.get(editorSessionStateAtom)).toBe(editing)
    expect(runtime.store.get(chatSettingsStateAtom).profile).toBe(current.profile)
    expect(runtime.store.get(effectiveProfileAtom).appearance.fontSize).toBe(30)
    expect(set).toHaveBeenCalledOnce()
  })

  it('still discards a draft and history when an external profile really changes', async () => {
    const { runtime, repository } = await createSession()
    runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 24 } })
    await repository.flush()
    runtime.store.set(previewStylePatchAtom, { id: 'font-size', patch: { appearance: { fontSize: 30 } } })
    const current = runtime.store.get(chatSettingsStateAtom)
    await chrome.storage.local.set({
      [APPEARANCE_STORAGE_KEY]: {
        schemaVersion: 1,
        writerId: 'external-editor',
        value: {
          profile: { ...current.profile, appearance: { ...current.profile.appearance, fontSize: 32 } },
          presets: current.presets,
        },
      },
    })
    await vi.waitFor(() => expect(runtime.store.get(effectiveProfileAtom).appearance.fontSize).toBe(32))

    expect(runtime.store.get(editorSessionStateAtom)).toEqual({ draftProfile: null, past: [], future: [], activeGesture: null })
  })
})
