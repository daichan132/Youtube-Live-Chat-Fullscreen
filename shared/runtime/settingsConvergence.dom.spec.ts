import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSettingsRepository, type SettingsRepository } from '@/shared/settings/repository'
import { APPEARANCE_STORAGE_KEY, ENABLED_STORAGE_KEY, GEOMETRY_STORAGE_KEY, THEME_STORAGE_KEY } from '@/shared/settings/storageKeys'
import {
  chatSettingsStateAtom,
  EMPTY_MESSAGES,
  editorSessionStateAtom,
  effectiveProfileAtom,
  globalSettingsStateAtom,
} from '@/shared/state/atoms'
import { commitStylePatchAtom, finishStyleGestureAtom, previewStylePatchAtom, setThemeModeAtom } from '@/shared/state/commands'
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
